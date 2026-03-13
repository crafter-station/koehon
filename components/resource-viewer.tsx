"use client";

import { useState, useEffect, useCallback } from "react";
import { PdfViewer } from "./elements/pdf-viewer";
import { Player } from "./ui/player";
import { LoaderDotMatrix } from "./elements/loader-dot-matrix";
import { resourcesApi } from "@/lib/api";

interface ResourceViewerProps {
  resourceId: string;
  pdfUrl: string;
  language: string;
}

export function ResourceViewer({
  resourceId,
  pdfUrl,
  language,
}: ResourceViewerProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isLoadingPage, setIsLoadingPage] = useState(false);

  // Debounced function to fetch page data
  const fetchPageData = useCallback(
    async (page: number) => {
      setIsLoadingPage(true);
      try {
        const data = await resourcesApi.getPage(resourceId, page, language);
        setAudioUrl(data.audioUrl);
      } catch (error: any) {
        // Check if it's a 404 error (page doesn't exist yet)
        if (error?.status === 404 || error?.error === "Page not found") {
          setAudioUrl(null);
          console.log(`Page ${page} not found - needs to be generated`);
        } else {
          console.error("Error fetching page data:", error);
          setAudioUrl(null);
        }
      } finally {
        setIsLoadingPage(false);
      }
    },
    [resourceId, language]
  );

  // Debounce page changes
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchPageData(currentPage);
    }, 500); // 500ms debounce

    return () => clearTimeout(timeoutId);
  }, [currentPage, fetchPageData]);

  return (
    <>
      {/* PDF Viewer */}
      <div className="mb-8">
        <PdfViewer
          file={pdfUrl}
          mode="single"
          className="h-[800px]"
          onPageChange={setCurrentPage}
        />
      </div>

      {/* Audio Player */}
      <div className="sticky bottom-0 bg-white pb-4 dark:bg-black">
        {isLoadingPage ? (
          <div className="border border-zinc-200 bg-white p-4 dark:border-white/10 dark:bg-zinc-900">
            <div className="flex flex-col items-center justify-center py-4">
              <LoaderDotMatrix rows={3} cols={5} dotSize={6} />
              <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">
                Loading page audio...
              </p>
            </div>
          </div>
        ) : audioUrl ? (
          <Player audioUrl={audioUrl} />
        ) : (
          <div className="border border-zinc-200 bg-white p-4 dark:border-white/10 dark:bg-zinc-900">
            <p className="text-center text-sm text-zinc-600 dark:text-zinc-400">
              Audio not available for this page
            </p>
          </div>
        )}
      </div>
    </>
  );
}
