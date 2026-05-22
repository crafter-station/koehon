import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import type { ApiErrorResponse } from "@/lib/api/types";
import { importResourcePackage } from "@/lib/resource-package";
import { deleteFile, fetchObjectBuffer } from "@/lib/storage/uploadx";

// Re-uploads PDF, cover, and every audio file to storage; allow time.
export const maxDuration = 300;

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" } as ApiErrorResponse,
        { status: 401 }
      );
    }

    let body: { key?: unknown };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Request body must be JSON" } as ApiErrorResponse,
        { status: 400 }
      );
    }

    const key = body?.key;
    if (typeof key !== "string" || !key) {
      return NextResponse.json(
        { error: "Missing uploadx file key" } as ApiErrorResponse,
        { status: 400 }
      );
    }

    let buffer: Buffer;
    try {
      buffer = await fetchObjectBuffer(key);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to read upload";
      return NextResponse.json(
        { error: message } as ApiErrorResponse,
        { status: 400 }
      );
    }

    try {
      const result = await importResourcePackage(buffer, userId);
      return NextResponse.json(
        {
          success: true,
          resourceId: result.resourceId,
          pagesImported: result.pagesImported,
          bookmarksImported: result.bookmarksImported,
        },
        { status: 201 }
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to import package";
      return NextResponse.json(
        { error: message } as ApiErrorResponse,
        { status: 400 }
      );
    } finally {
      // Best-effort cleanup of the temporary upload, success or fail.
      deleteFile(key).catch((err) =>
        console.error(`Failed to clean up uploadx file ${key}:`, err)
      );
    }
  } catch (error) {
    console.error("Error importing resource:", error);
    return NextResponse.json(
      { error: "Internal server error" } as ApiErrorResponse,
      { status: 500 }
    );
  }
}
