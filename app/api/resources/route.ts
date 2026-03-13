import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import type {
  CreateResourceResponse,
  ResourceResponse,
  ApiErrorResponse,
} from "@/lib/api/types";
import { uploadFile, generateObjectName } from "@/lib/storage/minio";
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

    // Validate file size (10MB max)
    const maxSize = 10 * 1024 * 1024; // 10MB in bytes
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "File size must be less than 10MB" } as ApiErrorResponse,
        { status: 400 }
      );
    }

    // Generate unique object names
    const pdfObjectName = generateObjectName(userId, file.name);
    const coverObjectName = generateObjectName(userId, cover.name);

    // Upload both files to MinIO
    const [pdfUpload, coverUpload] = await Promise.all([
      uploadFile(file, pdfObjectName),
      uploadFile(cover, coverObjectName),
    ]);

    console.log("Files uploaded to MinIO:", {
      pdf: {
        name: file.name,
        objectName: pdfObjectName,
        url: pdfUpload.url,
        etag: pdfUpload.etag,
      },
      cover: {
        name: cover.name,
        objectName: coverObjectName,
        url: coverUpload.url,
        etag: coverUpload.etag,
      },
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
