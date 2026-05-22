import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { resources, resourcePages } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import type { ApiErrorResponse } from "@/lib/api/types";
import { deleteFile, extractKeyFromUrl } from "@/lib/storage/uploadx";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" } as ApiErrorResponse,
        { status: 401 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const { title } = body;

    if (!title || typeof title !== "string" || !title.trim()) {
      return NextResponse.json(
        { error: "Title is required" } as ApiErrorResponse,
        { status: 400 }
      );
    }

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

    await db
      .update(resources)
      .set({ title: title.trim() })
      .where(eq(resources.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating resource:", error);
    return NextResponse.json(
      { error: "Internal server error" } as ApiErrorResponse,
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" } as ApiErrorResponse,
        { status: 401 }
      );
    }

    const { id } = await params;

    // Get resource with all its pages
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

    // Get all resource pages to delete their audio files
    const pages = await db
      .select()
      .from(resourcePages)
      .where(eq(resourcePages.resourceId, id));

    // Delete all audio files from storage
    const audioDeletePromises = pages.map(async (page) => {
      const key = extractKeyFromUrl(page.audioUrl);
      if (key) {
        try {
          await deleteFile(key);
          console.log(`Deleted audio file: ${key}`);
        } catch (error) {
          console.error(`Failed to delete audio file ${key}:`, error);
        }
      }
    });

    // Delete PDF and cover from storage
    const pdfKey = extractKeyFromUrl(resource.pdfUrl);
    const coverKey = extractKeyFromUrl(resource.coverUrl);

    const fileDeletePromises = [];

    if (pdfKey) {
      fileDeletePromises.push(
        deleteFile(pdfKey)
          .then(() => console.log(`Deleted PDF file: ${pdfKey}`))
          .catch((error) => console.error(`Failed to delete PDF ${pdfKey}:`, error))
      );
    }

    if (coverKey) {
      fileDeletePromises.push(
        deleteFile(coverKey)
          .then(() => console.log(`Deleted cover file: ${coverKey}`))
          .catch((error) => console.error(`Failed to delete cover ${coverKey}:`, error))
      );
    }

    // Wait for all storage deletions to complete (best effort)
    await Promise.allSettled([...audioDeletePromises, ...fileDeletePromises]);

    // Delete resource from database (this will cascade delete pages due to schema constraint)
    await db.delete(resources).where(eq(resources.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting resource:", error);
    return NextResponse.json(
      { error: "Internal server error" } as ApiErrorResponse,
      { status: 500 }
    );
  }
}
