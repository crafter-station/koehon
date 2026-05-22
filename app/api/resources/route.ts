import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import type {
  CreateResourceResponse,
  ResourceResponse,
  ApiErrorResponse,
} from "@/lib/api/types";
import { uploadFile } from "@/lib/storage/uploadx";
import { db } from "@/lib/db";
import { resources } from "@/lib/db/schema";

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({
        error: "Unauthorized",
      } as ApiErrorResponse, { status: 401 });
    }

    // Get form data
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const cover = formData.get("cover") as File | null;
    const language = formData.get("language") as string;

    // Validate inputs
    if (!file) {
      return NextResponse.json(
        { error: "File is required" } as ApiErrorResponse,
        { status: 400 }
      );
    }

    if (!cover) {
      return NextResponse.json(
        { error: "Cover image is required" } as ApiErrorResponse,
        { status: 400 }
      );
    }

    if (!language) {
      return NextResponse.json(
        { error: "Language is required" } as ApiErrorResponse,
        { status: 400 }
      );
    }

    // Validate file type
    if (!file.type.includes("pdf")) {
      return NextResponse.json(
        { error: "Only PDF files are allowed" } as ApiErrorResponse,
        { status: 400 }
      );
    }

    // Validate cover type
    if (!cover.type.includes("image")) {
      return NextResponse.json(
        { error: "Cover must be an image" } as ApiErrorResponse,
        { status: 400 }
      );
    }

    // Validate file size (20MB max)
    const maxSize = 20 * 1024 * 1024; // 20MB in bytes
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "File size must be less than 20MB" } as ApiErrorResponse,
        { status: 400 }
      );
    }

    // Upload both files to Uploadx
    const [pdfUpload, coverUpload] = await Promise.all([
      uploadFile(file),
      uploadFile(cover),
    ]);

    console.log("Files uploaded to Uploadx:", {
      pdf: { name: file.name, key: pdfUpload.key, url: pdfUpload.url },
      cover: { name: cover.name, key: coverUpload.key, url: coverUpload.url },
      language,
      userId,
    });

    // Save resource to database
    const [dbResource] = await db
      .insert(resources)
      .values({
        title: file.name.replace(".pdf", ""),
        pdfUrl: pdfUpload.url,
        coverUrl: coverUpload.url,
        userId,
        language,
      })
      .returning();

    // Create typed resource response
    const resource: ResourceResponse = {
      id: dbResource.id,
      title: dbResource.title,
      pdfUrl: dbResource.pdfUrl,
      coverUrl: dbResource.coverUrl,
      language: dbResource.language,
      userId: dbResource.userId,
      createdAt: dbResource.createdAt.toISOString(),
      updatedAt: dbResource.updatedAt.toISOString(),
    };

    // Return typed success response
    const response: CreateResourceResponse = {
      success: true,
      resource,
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error("Error uploading resource:", error);
    return NextResponse.json(
      { error: "Internal server error" } as ApiErrorResponse,
      { status: 500 }
    );
  }
}
