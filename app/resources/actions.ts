"use server";

import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { resources, resourcePages } from "@/lib/db/schema";
import { desc, eq, count, sum, and, gte } from "drizzle-orm";

export interface GetResourcesResult {
  resources: Array<{
    id: string;
    title: string;
    coverUrl: string;
    pdfUrl: string;
    language: string;
    userId: string;
    createdAt: Date;
    updatedAt: Date;
  }>;
  total: number;
  totalPages: number;
}

export interface Resource {
  id: string;
  title: string;
  coverUrl: string;
  pdfUrl: string;
  language: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

export async function getResources(
  page: number = 1
): Promise<GetResourcesResult> {
  const { userId } = await auth();

  if (!userId) {
    throw new Error("Unauthorized");
  }

  const limit = 10;
  const offset = (page - 1) * limit;

  // Get total count
  const [{ value: total }] = await db
    .select({ value: count() })
    .from(resources)
    .where(eq(resources.userId, userId));

  // Get paginated resources
  const userResources = await db
    .select()
    .from(resources)
    .where(eq(resources.userId, userId))
    .orderBy(desc(resources.createdAt))
    .limit(limit)
    .offset(offset);

  const totalPages = Math.ceil(total / limit);

  return {
    resources: userResources,
    total,
    totalPages,
  };
}

export async function getResource(id: string): Promise<Resource | null> {
  const { userId } = await auth();

  if (!userId) {
    throw new Error("Unauthorized");
  }

  const [resource] = await db
    .select()
    .from(resources)
    .where(eq(resources.id, id))
    .limit(1);

  // Check if resource exists and belongs to user
  if (!resource || resource.userId !== userId) {
    return null;
  }

  return resource;
}

export interface ResourceWithLoadedPages {
  resource: Resource;
  loadedPages: Array<{
    page: number;
    language: string;
  }>;
}

export async function getResourceWithLoadedPages(
  id: string
): Promise<ResourceWithLoadedPages | null> {
  const { userId } = await auth();

  if (!userId) {
    throw new Error("Unauthorized");
  }

  const [resource] = await db
    .select()
    .from(resources)
    .where(eq(resources.id, id))
    .limit(1);

  if (!resource || resource.userId !== userId) {
    return null;
  }

  const loadedPages = await db
    .select({
      page: resourcePages.page,
      language: resourcePages.language,
    })
    .from(resourcePages)
    .where(eq(resourcePages.resourceId, id))
    .orderBy(resourcePages.language, resourcePages.page);

  return {
    resource,
    loadedPages,
  };
}

export async function getTotalAudioHours(): Promise<number> {
  const { userId } = await auth();

  if (!userId) {
    throw new Error("Unauthorized");
  }

  // Sum all audio durations for the user's resources
  const result = await db
    .select({
      totalSeconds: sum(resourcePages.audioDuration),
    })
    .from(resourcePages)
    .innerJoin(resources, eq(resourcePages.resourceId, resources.id))
    .where(eq(resources.userId, userId));

  const totalSeconds = result[0]?.totalSeconds || 0;

  // Convert seconds to hours and round to 1 decimal place
  const totalHours = Number(totalSeconds) / 3600;
  return Math.round(totalHours * 10) / 10;
}

export async function getThisWeekAudioHours(): Promise<number> {
  const { userId } = await auth();

  if (!userId) {
    throw new Error("Unauthorized");
  }

  // Calculate the start of the current week (Sunday)
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);

  // Sum audio durations for pages created this week
  const result = await db
    .select({
      totalSeconds: sum(resourcePages.audioDuration),
    })
    .from(resourcePages)
    .innerJoin(resources, eq(resourcePages.resourceId, resources.id))
    .where(
      and(
        eq(resources.userId, userId),
        gte(resourcePages.createdAt, startOfWeek)
      )
    );

  const totalSeconds = result[0]?.totalSeconds || 0;

  // Convert seconds to hours and round to 1 decimal place
  const totalHours = Number(totalSeconds) / 3600;
  return Math.round(totalHours * 10) / 10;
}
