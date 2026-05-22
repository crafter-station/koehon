import { UploadxAPI } from "@uploadx-sdk/core/server";

let apiPromise: Promise<UploadxAPI> | null = null;

async function getApi(): Promise<UploadxAPI> {
  if (!apiPromise) {
    apiPromise = UploadxAPI.create();
  }
  return apiPromise;
}

/**
 * Build the permanent public URL for a stored object key.
 * Path segments are encoded so filenames with spaces/unicode survive routing.
 */
export function publicUrlForKey(key: string): string {
  return `/api/uploadx/f/${key.split("/").map(encodeURIComponent).join("/")}`;
}

/** Recover the original key from a URL written into the database. */
export function extractKeyFromUrl(url: string): string | null {
  try {
    const u = new URL(url, "http://localhost");
    const match = u.pathname.match(/\/api\/uploadx\/f\/(.+)$/);
    if (!match) return null;
    return match[1].split("/").map(decodeURIComponent).join("/");
  } catch {
    return null;
  }
}

export interface UploadedAsset {
  key: string;
  url: string;
  size: number;
}

/** Upload a single File to Uploadx storage. */
export async function uploadFile(file: File): Promise<UploadedAsset> {
  const api = await getApi();
  const buffer = Buffer.from(await file.arrayBuffer());
  const [uploaded] = await api.uploadFiles([
    {
      name: file.name,
      data: buffer,
      type: file.type,
    },
  ]);
  return {
    key: uploaded.key,
    url: publicUrlForKey(uploaded.key),
    size: uploaded.size,
  };
}

/** Delete a stored object by key. */
export async function deleteFile(key: string): Promise<void> {
  const api = await getApi();
  await api.deleteFiles([key]);
}

/**
 * Generate a short-lived signed URL pointing directly at storage.
 * Use this when an external service (e.g. an OCR API) must fetch the object
 * directly, rather than through our Next.js loopback.
 */
export async function getSignedDownloadUrl(
  key: string,
  expiresInSeconds: number = 3600
): Promise<string> {
  const api = await getApi();
  return api.generateSignedURL(key, expiresInSeconds);
}

/**
 * Fetch raw bytes for a stored object — used server-side for export/import.
 * Goes straight to storage via a short-lived signed URL (no Next.js loopback).
 */
export async function fetchObjectBuffer(key: string): Promise<Buffer> {
  const api = await getApi();
  const signedUrl = await api.generateSignedURL(key, 3600);
  const res = await fetch(signedUrl);
  if (!res.ok) {
    throw new Error(
      `Failed to fetch object ${key}: ${res.status} ${res.statusText}`
    );
  }
  return Buffer.from(await res.arrayBuffer());
}
