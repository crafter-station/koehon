import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import type {
  CreateResourceResponse,
  ResourceResponse,
  ApiErrorResponse,
} from "@/lib/api/types";

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
    const language = formData.get("language") as string;

    // Validate inputs
    if (!file) {
      return NextResponse.json(
        { error: "File is required" } as ApiErrorResponse,
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

    // Validate file size (10MB max)
    const maxSize = 10 * 1024 * 1024; // 10MB in bytes
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "File size must be less than 10MB" } as ApiErrorResponse,
        { status: 400 }
      );
    }

    // TODO: Process the file (upload to storage, extract text, etc.)
    // For now, this is a dummy endpoint that just validates and returns success

    console.log("File uploaded:", {
      name: file.name,
      size: file.size,
      type: file.type,
      language,
      userId,
    });

    // Simulate processing delay
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Create typed resource response
    const resource: ResourceResponse = {
      id: Math.random().toString(36).substring(7),
      title: file.name.replace(".pdf", ""),
      language,
      createdAt: new Date().toISOString(),
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
