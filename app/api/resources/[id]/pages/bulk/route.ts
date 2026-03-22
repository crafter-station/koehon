import { NextRequest, NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { resourcePages, resources, userSettings } from "@/lib/db/schema";
import { eq, count, inArray } from "drizzle-orm";
import pLimit from "p-limit";
import type { ApiErrorResponse, BulkGeneratePagesResponse } from "@/lib/api/types";
import {
  newExtractor,
  newAudioGenerator,
  newTranslator,
} from "@/lib/ai";
import { fetchPdfAsFile } from "@/lib/pdf-utils.server";
import { uploadFile, generateObjectName } from "@/lib/storage/minio";
import { getAudioDuration } from "@/lib/audio-utils";
import { USER_TIERS, getMaxPagesForTier, hasUnlimitedPages } from "@/lib/config/tiers";
import { getApiKey } from "@/lib/user-api-keys";
import { AI_PROVIDERS } from "@/lib/config/providers";

interface BulkPageRequest {
  pages: Array<{
    page: number;
    language: string;
    force?: boolean;
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

    // Get user's model preferences
    const [settings] = await db
      .select()
      .from(userSettings)
      .where(eq(userSettings.userId, userId))
      .limit(1);

    const extractorProvider = settings?.models?.extractor ?? AI_PROVIDERS.OPEN_AI;
    const translatorProvider = settings?.models?.translator ?? AI_PROVIDERS.OPEN_AI;
    const audioGeneratorProvider = settings?.models?.audio_generator ?? AI_PROVIDERS.OPEN_AI;

    const geminiApiKey = await getApiKey(userId, AI_PROVIDERS.GEMINI);
    const openAiApiKey = await getApiKey(userId, AI_PROVIDERS.OPEN_AI);

    const getCachedApiKey = (provider: string) => {
      switch (provider) {
        case AI_PROVIDERS.GEMINI:
          return geminiApiKey;
        case AI_PROVIDERS.OPEN_AI:
          return openAiApiKey;
        default:
          throw new Error(`Unsupported provider: ${provider}`);
      }
    }

    const extractor = newExtractor(extractorProvider, getCachedApiKey(extractorProvider));
    const translator = newTranslator(translatorProvider, getCachedApiKey(translatorProvider));
    const audioGenerator = newAudioGenerator(audioGeneratorProvider, getCachedApiKey(audioGeneratorProvider));

    // Fetch PDF file
    const pdfFile = await fetchPdfAsFile(resource.pdfUrl);

    // Fetch all existing pages for this resource in one query
    const existingPages = await db
      .select({
        id: resourcePages.id,
        page: resourcePages.page,
        language: resourcePages.language,
      })
      .from(resourcePages)
      .where(eq(resourcePages.resourceId, id));

    // Create a map for quick lookup: "page-language" -> page id
    const existingPagesMap = new Map(
      existingPages.map((p) => [`${p.page}-${p.language}`, p.id])
    );

    // Delete pages that have force=true and already exist
    const pagesToDelete = body.pages
      .filter(({ page, language, force }) => force && existingPagesMap.has(`${page}-${language}`))
      .map(({ page, language }) => existingPagesMap.get(`${page}-${language}`)!);

    if (pagesToDelete.length > 0) {
      await db
        .delete(resourcePages)
        .where(inArray(resourcePages.id, pagesToDelete));

      console.log(`Deleted ${pagesToDelete.length} existing page(s) for re-processing`);
    }

    // Filter out pages that already exist (unless force=true)
    const pagesToProcess = body.pages.filter(
      ({ page, language, force }) => force || !existingPagesMap.has(`${page}-${language}`)
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
            const extractedText = await extractor.extractPageTextWithImages(pdfFile, page);

            // 2. Translate text to target language
            const translatedText = await translator.translateText(extractedText, language);

            // 3. Convert translated text to audio using OpenAI TTS
            const audioBlob = await audioGenerator.generateAudio(translatedText, language);

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
