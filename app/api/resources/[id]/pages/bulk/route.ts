import { NextRequest, NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { resourcePages, resources } from "@/lib/db/schema";
import { eq, and, count } from "drizzle-orm";
import pLimit from "p-limit";
import type { ApiErrorResponse, BulkGeneratePagesResponse } from "@/lib/api/types";
import {
  extractPageTextWithImages,
  translateText,
  generateAudio,
} from "@/lib/openai";
import { fetchPdfAsFile } from "@/lib/pdf-utils.server";
import { uploadFile, generateObjectName } from "@/lib/storage/minio";
import { getAudioDuration } from "@/lib/audio-utils";
import { USER_TIERS, getMaxPagesForTier, hasUnlimitedPages } from "@/lib/config/tiers";

interface BulkPageRequest {
  pages: Array<{
    page: number;
    language: string;
  }>;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" } as ApiErrorResponse,
        { status: 401 }
      );
    }

    const { id } = await params;

    // Verify the resource belongs to the user
    const [resource] = await db
      .select()
      .from(resources)
      .where(eq(resources.id, id))
      .limit(1);

    if (!resource) {
      return NextResponse.json(
        { error: "Resource not found" } as ApiErrorResponse,
        { status: 404 }
      );
    }

    if (resource.userId !== userId) {
      return NextResponse.json(
        { error: "Unauthorized" } as ApiErrorResponse,
        { status: 403 }
      );
    }

    // Parse request body
    const body = (await request.json()) as BulkPageRequest;

    if (!body.pages || !Array.isArray(body.pages) || body.pages.length === 0) {
      return NextResponse.json(
        { error: "Pages array is required" } as ApiErrorResponse,
        { status: 400 }
      );
    }

    // Fetch PDF file
    const pdfFile = await fetchPdfAsFile(resource.pdfUrl);

    // Fetch all existing pages for this resource in one query
    const existingPages = await db
      .select({
        page: resourcePages.page,
        language: resourcePages.language,
      })
      .from(resourcePages)
      .where(eq(resourcePages.resourceId, id));

    // Create a map for quick lookup: "page-language" -> true
    const existingPagesMap = new Map(
      existingPages.map((p) => [`${p.page}-${p.language}`, true])
    );

    // Filter out pages that already exist
    const pagesToProcess = body.pages.filter(
      ({ page, language }) => !existingPagesMap.has(`${page}-${language}`)
    );

    // Log skipped pages
    const skippedCount = body.pages.length - pagesToProcess.length;
    if (skippedCount > 0) {
      console.log(`Skipping ${skippedCount} pages that already exist`);
    }

    // Check user tier and enforce limits
    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    const userTier = (user.privateMetadata?.tier as string) || USER_TIERS.FREE;

    // Only enforce limits for users without unlimited pages
    if (!hasUnlimitedPages(userTier)) {
      const maxPages = getMaxPagesForTier(userTier);

      // Count existing pages for this user
      const [{ total: existingCount }] = await db
        .select({ total: count() })
        .from(resourcePages)
        .innerJoin(resources, eq(resourcePages.resourceId, resources.id))
        .where(eq(resources.userId, userId));

      const newPagesToCreate = pagesToProcess.length;
      const totalAfterGeneration = existingCount + newPagesToCreate;

      if (totalAfterGeneration > maxPages) {
        const remaining = Math.max(0, maxPages - existingCount);
        return NextResponse.json(
          {
            error: `Free tier limit exceeded. You have ${existingCount}/${maxPages} pages. You can only generate ${remaining} more page${remaining !== 1 ? "s" : ""}.`,
          } as ApiErrorResponse,
          { status: 403 }
        );
      }
    }

    // Create a limit function for 3 concurrent operations
    // You can adjust this number based on OpenAI rate limits
    const limit = pLimit(3);

    // Process pages concurrently with limit
    const results = await Promise.allSettled(
      pagesToProcess.map((pageRequest) =>
        limit(async () => {
          const { page, language } = pageRequest;

          try {
            // 1. Extract text from PDF page using OpenAI (with image descriptions)
            const extractedText = await extractPageTextWithImages(pdfFile, page);

            // 2. Translate text to target language
            const translatedText = await translateText(extractedText, language);

            // 3. Convert translated text to audio using OpenAI TTS
            const audioBlob = await generateAudio(translatedText);

            // 4. Get audio duration
            const audioDuration = await getAudioDuration(audioBlob);

            // 5. Upload audio to MinIO
            const audioFile = new File(
              [audioBlob],
              `${resource.id}-page-${page}-${language}.mp3`,
              { type: "audio/mpeg" }
            );
            const audioObjectName = generateObjectName(userId, audioFile.name);
            const { url: audioUrl } = await uploadFile(audioFile, audioObjectName);

            // 6. Store resource page in database
            const [newPage] = await db
              .insert(resourcePages)
              .values({
                resourceId: id,
                page,
                language,
                content: translatedText,
                audioUrl,
                audioDuration,
              })
              .returning();

            console.log(`✓ Created page ${page} with language ${language}`);

            return {
              success: true,
              page: {
                id: newPage.id,
                resourceId: newPage.resourceId,
                page: newPage.page,
                language: newPage.language,
                content: newPage.content,
                audioUrl: newPage.audioUrl,
                audioDuration: newPage.audioDuration,
                createdAt: newPage.createdAt.toISOString(),
                updatedAt: newPage.updatedAt.toISOString(),
              },
            };
          } catch (error) {
            const errorMessage =
              error instanceof Error ? error.message : "Unknown error";
            console.error(
              `✗ Error processing page ${page} with language ${language}:`,
              error
            );
            throw { page, language, error: errorMessage };
          }
        })
      )
    );

    // Separate successful and failed results
    const createdPages = [];
    const errors: Array<{ page: number; language: string; error: string }> = [];

    for (const result of results) {
      if (result.status === "fulfilled" && result.value.success) {
        createdPages.push(result.value.page);
      } else if (result.status === "rejected") {
        errors.push(result.reason);
      }
    }

    return NextResponse.json(
      {
        success: true,
        pages: createdPages,
        errors: errors.length > 0 ? errors : undefined,
      } as BulkGeneratePagesResponse,
      { status: 201 }
    );
  } catch (error) {
    console.error("Error bulk creating resource pages:", error);
    return NextResponse.json(
      { error: "Internal server error" } as ApiErrorResponse,
      { status: 500 }
    );
  }
}
