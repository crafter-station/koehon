import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { userSettings } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import type { ApiErrorResponse } from "@/lib/api/types";

// GET - Retrieve user settings
export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" } as ApiErrorResponse,
        { status: 401 }
      );
    }

    const [settings] = await db
      .select()
      .from(userSettings)
      .where(eq(userSettings.userId, userId))
      .limit(1);

    if (!settings) {
      // Return defaults if no settings exist
      return NextResponse.json({
        models: {
          extractor: "openai",
          translator: "openai",
          audio_generator: "openai",
        },
      });
    }

    return NextResponse.json({ models: settings.models });
  } catch (error) {
    console.error("Error fetching user settings:", error);
    return NextResponse.json(
      { error: "Internal server error" } as ApiErrorResponse,
      { status: 500 }
    );
  }
}

// PUT - Update user settings
export async function PUT(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" } as ApiErrorResponse,
        { status: 401 }
      );
    }

    const body = await request.json();
    const { models } = body;

    if (!models || !models.extractor || !models.translator || !models.audio_generator) {
      return NextResponse.json(
        { error: "All model fields are required" } as ApiErrorResponse,
        { status: 400 }
      );
    }

    // Check if settings exist
    const [existing] = await db
      .select()
      .from(userSettings)
      .where(eq(userSettings.userId, userId))
      .limit(1);

    if (existing) {
      await db
        .update(userSettings)
        .set({ models, updatedAt: new Date() })
        .where(eq(userSettings.id, existing.id));
    } else {
      await db
        .insert(userSettings)
        .values({ userId, models });
    }

    return NextResponse.json({ message: "Settings saved successfully", models });
  } catch (error) {
    console.error("Error saving user settings:", error);
    return NextResponse.json(
      { error: "Internal server error" } as ApiErrorResponse,
      { status: 500 }
    );
  }
}
