import JSZip from "jszip";
import { eq } from "drizzle-orm";
import { db } from "./db";
import { resources, resourcePages, bookmarks } from "./db/schema";
import {
  uploadFile,
  extractKeyFromUrl,
  fetchObjectBuffer,
} from "./storage/uploadx";

export const PACKAGE_VERSION = 1;
export const MANIFEST_FILENAME = "manifest.json";
export const PDF_FILENAME = "pdf.pdf";
const COVER_BASENAME = "cover";
const AUDIO_DIR = "audios";

export interface ResourcePackageManifest {
  version: number;
  exportedAt: string;
  resource: {
    title: string;
    language: string;
  };
  files: {
    pdf: string;
    cover: string;
  };
  pages: Array<{
    page: number;
    language: string;
    content: string;
    audioDuration: number;
    audioFile: string;
  }>;
  bookmarks: Array<{
    name: string;
    page: number;
  }>;
}

function sanitizeForFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9-_.]/g, "_").slice(0, 80);
}

function getExtensionFromUrl(url: string, fallback: string): string {
  const cleaned = url.split("?")[0];
  const match = cleaned.match(/\.([a-zA-Z0-9]{2,5})$/);
  return match ? match[1].toLowerCase() : fallback;
}

async function fetchAsBuffer(url: string): Promise<Buffer> {
  const key = extractKeyFromUrl(url);

  // Prefer pulling directly from storage via a signed URL — that avoids the
  // Next.js loopback through /api/uploadx/f/<key>.
  if (key) {
    try {
      return await fetchObjectBuffer(key);
    } catch (error) {
      console.warn(
        `Falling back to HTTP fetch for ${url} (storage read failed):`,
        error
      );
    }
  }

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
  }
  return Buffer.from(await response.arrayBuffer());
}

async function bufferToFile(
  buffer: Buffer,
  filename: string,
  mimeType: string
): Promise<File> {
  // Create a fresh ArrayBuffer slice so it isn't tied to a SharedArrayBuffer
  const ab = buffer.buffer.slice(
    buffer.byteOffset,
    buffer.byteOffset + buffer.byteLength
  ) as ArrayBuffer;
  return new File([ab], filename, { type: mimeType });
}

/**
 * Build a ZIP buffer for a single resource owned by the user.
 * Returns the zip buffer plus a sanitized filename suitable for download.
 */
export async function buildResourcePackage(
  resourceId: string,
  userId: string
): Promise<{ buffer: Buffer; filename: string; resourceTitle: string }> {
  const [resource] = await db
    .select()
    .from(resources)
    .where(eq(resources.id, resourceId))
    .limit(1);

  if (!resource) {
    throw new Error("Resource not found");
  }
  if (resource.userId !== userId) {
    throw new Error("Forbidden");
  }

  const [pages, resourceBookmarks] = await Promise.all([
    db
      .select()
      .from(resourcePages)
      .where(eq(resourcePages.resourceId, resourceId))
      .orderBy(resourcePages.language, resourcePages.page),
    db
      .select()
      .from(bookmarks)
      .where(eq(bookmarks.resourceId, resourceId))
      .orderBy(bookmarks.page),
  ]);

  const coverExt = getExtensionFromUrl(resource.coverUrl, "webp");
  const coverFilename = `${COVER_BASENAME}.${coverExt}`;

  const manifest: ResourcePackageManifest = {
    version: PACKAGE_VERSION,
    exportedAt: new Date().toISOString(),
    resource: {
      title: resource.title,
      language: resource.language,
    },
    files: {
      pdf: PDF_FILENAME,
      cover: coverFilename,
    },
    pages: pages.map((p) => ({
      page: p.page,
      language: p.language,
      content: p.content,
      audioDuration: p.audioDuration,
      audioFile: `${AUDIO_DIR}/page-${p.page}-${p.language}.mp3`,
    })),
    bookmarks: resourceBookmarks.map((b) => ({
      name: b.name,
      page: b.page,
    })),
  };

  const zip = new JSZip();
  zip.file(MANIFEST_FILENAME, JSON.stringify(manifest, null, 2));

  const [pdfBuffer, coverBuffer, ...audioBuffers] = await Promise.all([
    fetchAsBuffer(resource.pdfUrl),
    fetchAsBuffer(resource.coverUrl),
    ...pages.map((p) => fetchAsBuffer(p.audioUrl)),
  ]);

  zip.file(PDF_FILENAME, pdfBuffer);
  zip.file(coverFilename, coverBuffer);

  pages.forEach((p, i) => {
    zip.file(manifest.pages[i].audioFile, audioBuffers[i]);
  });

  const buffer = await zip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });

  const filename = `${sanitizeForFilename(resource.title) || "resource"}.koehon.zip`;

  return { buffer, filename, resourceTitle: resource.title };
}

export interface ImportResult {
  resourceId: string;
  pagesImported: number;
  bookmarksImported: number;
}

/**
 * Parse a resource package ZIP and persist it as a new resource owned by userId.
 * Generates new IDs and re-uploads all assets to storage.
 */
export async function importResourcePackage(
  zipBuffer: Buffer,
  userId: string
): Promise<ImportResult> {
  const zip = await JSZip.loadAsync(zipBuffer);

  const manifestFile = zip.file(MANIFEST_FILENAME);
  if (!manifestFile) {
    throw new Error("Invalid package: missing manifest.json");
  }

  let manifest: ResourcePackageManifest;
  try {
    manifest = JSON.parse(await manifestFile.async("string"));
  } catch {
    throw new Error("Invalid package: manifest.json is not valid JSON");
  }

  if (!manifest || typeof manifest !== "object") {
    throw new Error("Invalid package: manifest is malformed");
  }
  if (manifest.version !== PACKAGE_VERSION) {
    throw new Error(
      `Unsupported package version ${manifest.version}. Expected ${PACKAGE_VERSION}.`
    );
  }
  if (!manifest.resource?.title || !manifest.resource?.language) {
    throw new Error("Invalid package: resource metadata missing");
  }
  if (!manifest.files?.pdf || !manifest.files?.cover) {
    throw new Error("Invalid package: file references missing");
  }

  const pdfEntry = zip.file(manifest.files.pdf);
  const coverEntry = zip.file(manifest.files.cover);
  if (!pdfEntry) throw new Error(`Invalid package: missing ${manifest.files.pdf}`);
  if (!coverEntry) throw new Error(`Invalid package: missing ${manifest.files.cover}`);

  const pdfBuffer = Buffer.from(await pdfEntry.async("arraybuffer"));
  const coverBuffer = Buffer.from(await coverEntry.async("arraybuffer"));

  const pdfFile = await bufferToFile(pdfBuffer, manifest.files.pdf, "application/pdf");
  const coverExt = getExtensionFromUrl(manifest.files.cover, "webp");
  const coverMime = coverExt === "webp" ? "image/webp"
    : coverExt === "png" ? "image/png"
    : coverExt === "jpg" || coverExt === "jpeg" ? "image/jpeg"
    : "application/octet-stream";
  const coverFile = await bufferToFile(coverBuffer, manifest.files.cover, coverMime);

  const [pdfUpload, coverUpload] = await Promise.all([
    uploadFile(pdfFile),
    uploadFile(coverFile),
  ]);

  const [insertedResource] = await db
    .insert(resources)
    .values({
      title: manifest.resource.title,
      pdfUrl: pdfUpload.url,
      coverUrl: coverUpload.url,
      userId,
      language: manifest.resource.language,
    })
    .returning();

  // Upload audio files and prepare page rows
  const pageRows = await Promise.all(
    (manifest.pages ?? []).map(async (p) => {
      const audioEntry = zip.file(p.audioFile);
      if (!audioEntry) {
        throw new Error(`Invalid package: missing audio file ${p.audioFile}`);
      }
      const audioBuffer = Buffer.from(await audioEntry.async("arraybuffer"));
      const audioName = `${insertedResource.id}-page-${p.page}-${p.language}.mp3`;
      const audioFile = await bufferToFile(audioBuffer, audioName, "audio/mpeg");
      const { url } = await uploadFile(audioFile);
      return {
        resourceId: insertedResource.id,
        page: p.page,
        language: p.language,
        content: p.content,
        audioUrl: url,
        audioDuration: p.audioDuration ?? 0,
      };
    })
  );

  if (pageRows.length > 0) {
    await db.insert(resourcePages).values(pageRows);
  }

  const bookmarkRows = (manifest.bookmarks ?? []).map((b) => ({
    resourceId: insertedResource.id,
    name: b.name,
    page: b.page,
  }));

  if (bookmarkRows.length > 0) {
    await db.insert(bookmarks).values(bookmarkRows);
  }

  return {
    resourceId: insertedResource.id,
    pagesImported: pageRows.length,
    bookmarksImported: bookmarkRows.length,
  };
}
