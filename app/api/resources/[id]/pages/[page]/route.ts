import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { resourcePages, resources } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import type { ApiErrorResponse } from "@/lib/api/types";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; page: string }> }
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

    // Get params
    const { id, page } = await params;
    const pageNumber = parseInt(page, 10);

    // Validate page number
    if (isNaN(pageNumber) || pageNumber < 1) {
      return NextResponse.json(
        { error: "Invalid page number" } as ApiErrorResponse,
        { status: 400 }
      );
    }

    // Get language from query params
    const { searchParams } = new URL(request.url);
    const language = searchParams.get("language");

    if (!language) {
      return NextResponse.json(
        { error: "Language is required" } as ApiErrorResponse,
        { status: 400 }
      );
    }

    // First, verify the resource belongs to the user
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

    // Find the resource page
    const [resourcePage] = await db
      .select()
      .from(resourcePages)
      .where(
        and(
          eq(resourcePages.resourceId, id),
          eq(resourcePages.page, pageNumber),
          eq(resourcePages.language, language)
        )
      )
      .limit(1);

    if (!resourcePage) {
      return NextResponse.json(
        { error: "Page not found" } as ApiErrorResponse,
        { status: 404 }
      );
    }

    // Return the page data
    return NextResponse.json(
      {
        id: resourcePage.id,
        resourceId: resourcePage.resourceId,
        page: resourcePage.page,
        language: resourcePage.language,
        content: resourcePage.content,
        audioUrl: resourcePage.audioUrl,
        createdAt: resourcePage.createdAt.toISOString(),
        updatedAt: resourcePage.updatedAt.toISOString(),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching resource page:", error);
    return NextResponse.json(
      { error: "Internal server error" } as ApiErrorResponse,
      { status: 500 }
    );
  }
}
