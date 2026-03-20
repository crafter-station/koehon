import { PDFDocument } from "pdf-lib";

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
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(
      `Failed to fetch PDF: ${response.status} ${response.statusText}`,
    );
  }

  const blob = await response.blob();

  // Extract filename from URL if not provided
  const finalFilename =
    filename || url.split("/").pop()?.split("?")[0] || "document.pdf";

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
  // Convert Uint8Array to ArrayBuffer for Blob compatibility
  return new Blob([pdfBytes.slice().buffer], { type: "application/pdf" });
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
