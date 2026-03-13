import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { resources, resourcePages } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import type { ApiErrorResponse } from "@/lib/api/types";
import { deleteFile, extractObjectNameFromUrl } from "@/lib/storage/minio";

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

    // Delete all audio files from MinIO
    const audioDeletePromises = pages.map(async (page) => {
      const objectName = extractObjectNameFromUrl(page.audioUrl);
      if (objectName) {
        try {
          await deleteFile(objectName);
          console.log(`Deleted audio file: ${objectName}`);
        } catch (error) {
          console.error(`Failed to delete audio file ${objectName}:`, error);
        }
      }
    });

    // Delete PDF and cover from MinIO
    const pdfObjectName = extractObjectNameFromUrl(resource.pdfUrl);
    const coverObjectName = extractObjectNameFromUrl(resource.coverUrl);

    const fileDeletePromises = [];

    if (pdfObjectName) {
      fileDeletePromises.push(
        deleteFile(pdfObjectName)
          .then(() => console.log(`Deleted PDF file: ${pdfObjectName}`))
          .catch((error) => console.error(`Failed to delete PDF ${pdfObjectName}:`, error))
      );
    }

    if (coverObjectName) {
      fileDeletePromises.push(
        deleteFile(coverObjectName)
          .then(() => console.log(`Deleted cover file: ${coverObjectName}`))
          .catch((error) => console.error(`Failed to delete cover ${coverObjectName}:`, error))
      );
    }

    // Wait for all MinIO deletions to complete (best effort)
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
