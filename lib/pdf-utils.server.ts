import { PDFDocument } from "pdf-lib";
import { execFile } from "child_process";
import { writeFile, readFile, unlink, mkdtemp } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { promisify } from "util";
import { readFileSync } from "fs";
import { extractKeyFromUrl, fetchObjectBuffer } from "./storage/uploadx";

const execFileAsync = promisify(execFile);

export interface PdfPageInfo {
  pageNumber: number;
  width: number;
  height: number;
  rotation: number;
}

export interface PdfDocumentInfo {
  numPages: number;
  title?: string;
  author?: string;
  subject?: string;
  keywords?: string;
  creator?: string;
  producer?: string;
  creationDate?: Date;
  modificationDate?: Date;
}

/**
 * Fetch a PDF from a URL and convert it to a File object
 * @param url - URL to the PDF file
 * @param filename - Optional filename (defaults to extracted from URL or "document.pdf")
 * @returns File object containing the PDF data
 */
export async function fetchPdfAsFile(
  url: string,
  filename?: string,
): Promise<File> {
  const finalFilename =
    filename || url.split("/").pop()?.split("?")[0] || "document.pdf";

  // If the URL points at our own Uploadx storage (a relative /api/uploadx/f/<key>
  // path), Node's global fetch can't resolve it. Read straight from storage.
  const key = extractKeyFromUrl(url);
  if (key) {
    const buffer = await fetchObjectBuffer(key);
    const ab = buffer.buffer.slice(
      buffer.byteOffset,
      buffer.byteOffset + buffer.byteLength,
    ) as ArrayBuffer;
    return new File([ab], finalFilename, { type: "application/pdf" });
  }

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(
      `Failed to fetch PDF: ${response.status} ${response.statusText}`,
    );
  }
  const blob = await response.blob();
  return new File([blob], finalFilename, { type: "application/pdf" });
}

/**
 * Load PDF document using pdf-lib (works in browser and Node.js)
 */
async function loadPdfLibDocument(file: File) {
  const arrayBuffer = await file.arrayBuffer();
  return await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
}

/**
 * Get information about a PDF document
 * Uses pdf-lib (works in browser and Node.js)
 * @param file - PDF File object (use fetchPdfAsFile() to convert URL to File)
 * @returns Document metadata and page count
 */
export async function getPdfInfo(file: File): Promise<PdfDocumentInfo> {
  const pdfDoc = await loadPdfLibDocument(file);

  return {
    numPages: pdfDoc.getPageCount(),
    title: pdfDoc.getTitle() || undefined,
    author: pdfDoc.getAuthor() || undefined,
    subject: pdfDoc.getSubject() || undefined,
    keywords: pdfDoc.getKeywords() || undefined,
    creator: pdfDoc.getCreator() || undefined,
    producer: pdfDoc.getProducer() || undefined,
    creationDate: pdfDoc.getCreationDate() || undefined,
    modificationDate: pdfDoc.getModificationDate() || undefined,
  };
}

/**
 * Get information about a specific page
 * Uses pdf-lib (works in browser and Node.js)
 * @param file - PDF File object (use fetchPdfAsFile() to convert URL to File)
 * @param pageNumber - Page number (1-indexed)
 * @returns Page dimensions and rotation
 */
export async function getPageInfo(
  file: File,
  pageNumber: number,
): Promise<PdfPageInfo> {
  const pdfDoc = await loadPdfLibDocument(file);
  const pageCount = pdfDoc.getPageCount();

  if (pageNumber < 1 || pageNumber > pageCount) {
    throw new Error(
      `Page number ${pageNumber} is out of range (1-${pageCount})`,
    );
  }

  const page = pdfDoc.getPage(pageNumber - 1); // pdf-lib uses 0-indexed
  const { width, height } = page.getSize();
  const rotation = page.getRotation().angle;

  return {
    pageNumber,
    width,
    height,
    rotation,
  };
}

/**
 * Extract a single page as a new PDF blob
 * Uses pdf-lib (works in browser and Node.js)
 * @param file - PDF File object (use fetchPdfAsFile() to convert URL to File)
 * @param pageNumber - Page number to extract (1-indexed)
 * @returns Blob containing single-page PDF
 */
export async function extractPage(
  file: File,
  pageNumber: number,
): Promise<Blob> {
  const pdfDoc = await loadPdfLibDocument(file);
  const pageCount = pdfDoc.getPageCount();

  if (pageNumber < 1 || pageNumber > pageCount) {
    throw new Error(
      `Page number ${pageNumber} is out of range (1-${pageCount})`,
    );
  }

  const newPdf = await PDFDocument.create();
  const [copiedPage] = await newPdf.copyPages(pdfDoc, [pageNumber - 1]);
  newPdf.addPage(copiedPage);

  const pdfBytes = await newPdf.save();
  return new Blob([pdfBytes.buffer as ArrayBuffer], { type: "application/pdf" });
}

/**
 * Extract a range of pages as a new PDF blob
 * Uses pdf-lib (works in browser and Node.js)
 * @param file - PDF File object (use fetchPdfAsFile() to convert URL to File)
 * @param startPage - First page to extract (1-indexed, inclusive)
 * @param endPage - Last page to extract (1-indexed, inclusive)
 * @returns Blob containing extracted pages
 */
export async function extractPageRange(
  file: File,
  startPage: number,
  endPage: number,
): Promise<Blob> {
  const pdfDoc = await loadPdfLibDocument(file);
  const pageCount = pdfDoc.getPageCount();

  if (startPage < 1 || endPage > pageCount || startPage > endPage) {
    throw new Error(
      `Invalid page range ${startPage}-${endPage} (document has ${pageCount} pages)`,
    );
  }

  const newPdf = await PDFDocument.create();
  const pageIndices = Array.from(
    { length: endPage - startPage + 1 },
    (_, i) => startPage - 1 + i,
  );
  const copiedPages = await newPdf.copyPages(pdfDoc, pageIndices);

  for (const page of copiedPages) {
    newPdf.addPage(page);
  }

  const pdfBytes = await newPdf.save();
  // Convert Uint8Array to ArrayBuffer for Blob compatibility
  return new Blob([pdfBytes.slice().buffer], { type: "application/pdf" });
}

/**
 * Extract a single page from a PDF as a JPG image using poppler-utils (pdftoppm)
 * Requires poppler-utils to be installed on the system
 * @param file - PDF File or Buffer
 * @param pageNumber - Page number to extract (1-indexed)
 * @param dpi - Image resolution in DPI (default: 150)
 * @returns Buffer containing JPG image data
 */
export async function extractPageAsJpg(
  file: File | Buffer,
  pageNumber: number,
  dpi: number = 150,
): Promise<Buffer> {
  const tempDir = await mkdtemp(join(tmpdir(), "pdf-"));
  const inputPath = join(tempDir, "input.pdf");
  const outputPrefix = join(tempDir, "output");

  try {
    // Write PDF to temp file
    const pdfBuffer = Buffer.isBuffer(file)
      ? file
      : Buffer.from(await (file as File).arrayBuffer());

    await writeFile(inputPath, pdfBuffer);

    // Use pdftoppm to convert single page to JPG
    await execFileAsync("pdftoppm", [
      "-jpeg",
      "-r", String(dpi),
      "-f", String(pageNumber),
      "-l", String(pageNumber),
      "-singlefile",
      inputPath,
      outputPrefix,
    ]);

    // Read the generated JPG file
    const outputPath = `${outputPrefix}.jpg`;
    const jpgBuffer = readFileSync(outputPath);

    // Cleanup temp files
    await unlink(inputPath).catch(() => {});
    await unlink(outputPath).catch(() => {});

    return jpgBuffer;
  } catch (error) {
    // Cleanup on error
    await unlink(inputPath).catch(() => {});

    throw new Error(
      `Failed to convert PDF page ${pageNumber} to JPG: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

/**
 * Extract a single page from a PDF as a JPG file on disk using poppler-utils (pdftoppm)
 * The caller is responsible for cleaning up the returned file path
 * @param file - PDF File or Buffer
 * @param pageNumber - Page number to extract (1-indexed)
 * @param dpi - Image resolution in DPI (default: 150)
 * @returns Path to the generated JPG file
 */
export async function extractPageAsJpgPath(
  file: File | Buffer,
  pageNumber: number,
  dpi: number = 150,
): Promise<string> {
  const tempDir = await mkdtemp(join(tmpdir(), "pdf-"));
  const inputPath = join(tempDir, "input.pdf");
  const outputPrefix = join(tempDir, "output");

  try {
    const pdfBuffer = Buffer.isBuffer(file)
      ? file
      : Buffer.from(await (file as File).arrayBuffer());

    await writeFile(inputPath, pdfBuffer);

    await execFileAsync("pdftoppm", [
      "-jpeg",
      "-r", String(dpi),
      "-f", String(pageNumber),
      "-l", String(pageNumber),
      "-singlefile",
      inputPath,
      outputPrefix,
    ]);

    // Cleanup only the input PDF, keep the output JPG
    await unlink(inputPath).catch(() => {});

    return `${outputPrefix}.jpg`;
  } catch (error) {
    await unlink(inputPath).catch(() => {});

    throw new Error(
      `Failed to convert PDF page ${pageNumber} to JPG: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}
