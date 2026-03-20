"use client";

import { useState, useEffect, useCallback } from "react";
import { PdfViewer } from "./elements/pdf-viewer";
import { Player } from "./ui/player";
import { LoaderDotMatrix } from "./elements/loader-dot-matrix";
import { resourcesApi } from "@/lib/api";
import type { BookmarkResponse } from "@/lib/api/types";

interface ResourceViewerProps {
  resourceId: string;
  pdfUrl: string;
  language: string;
  initialPage?: number;
}

// Generate a random bookmark name
function generateBookmarkName(): string {
  const adjectives = ["Quick", "Bright", "Silent", "Swift", "Golden", "Silver", "Crystal", "Jade", "Ruby", "Pearl"];
  const nouns = ["Star", "Moon", "Wave", "Storm", "Cloud", "River", "Forest", "Mountain", "Valley", "Ocean"];
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  return `${adj} ${noun}`;
}

export function ResourceViewer({
  resourceId,
  pdfUrl,
  language,
  initialPage = 1,
}: ResourceViewerProps) {
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isLoadingPage, setIsLoadingPage] = useState(false);
  const [isAutoplayEnabled, setIsAutoplayEnabled] = useState(false);
  const [volume, setVolume] = useState(1);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [bookmarks, setBookmarks] = useState<BookmarkResponse[]>([]);
  const [currentPageBookmark, setCurrentPageBookmark] = useState<BookmarkResponse | null>(null);
  const [isBookmarkLoading, setIsBookmarkLoading] = useState(false);
  const [isReprocessing, setIsReprocessing] = useState(false);

  const loadBookmarks = useCallback(async () => {
    try {
      const data = await resourcesApi.getBookmarks(resourceId);
      setBookmarks(data.bookmarks);
      return data.bookmarks;
    } catch (error) {
      console.error("Error loading bookmarks:", error);
      return [];
    }
  }, [resourceId]);

  const checkCurrentPageBookmark = useCallback((page: number, bookmarksList: BookmarkResponse[]) => {
    const bookmark = bookmarksList.find((b) => b.page === page);
    setCurrentPageBookmark(bookmark || null);
  }, []);

  const toggleBookmark = useCallback(async () => {
    if (isBookmarkLoading) return;

    setIsBookmarkLoading(true);
    try {
      if (currentPageBookmark) {
        // Delete bookmark
        await resourcesApi.deleteBookmark(resourceId, currentPageBookmark.id);
        const updatedBookmarks = bookmarks.filter((b) => b.id !== currentPageBookmark.id);
        setBookmarks(updatedBookmarks);
        setCurrentPageBookmark(null);
      } else {
        // Create bookmark
        const name = generateBookmarkName();
        const response = await resourcesApi.createBookmark(resourceId, {
          page: currentPage,
          name,
        });
        const updatedBookmarks = [...bookmarks, response.bookmark];
        setBookmarks(updatedBookmarks);
        setCurrentPageBookmark(response.bookmark);
      }
    } catch (error) {
      console.error("Error toggling bookmark:", error);
    } finally {
      setIsBookmarkLoading(false);
    }
  }, [resourceId, currentPage, currentPageBookmark, bookmarks, isBookmarkLoading]);

  const fetchPageData = useCallback(
    async (page: number) => {
      setIsLoadingPage(true);
      try {
        const data = await resourcesApi.getPage(resourceId, page, language);
        setAudioUrl(data.audioUrl);
        setIsLoadingPage(false);
      } catch (error: any) {
        if (error?.status === 404 || error?.error === "Page not found") {
          setAudioUrl(null);
          console.log(`Page ${page} not found - triggering bulk generation`);

          const pagesToGenerate = [
            { page: page, language },
            { page: page + 1, language },
            { page: page + 2, language },
          ];

          resourcesApi
            .bulkGeneratePages(resourceId, { pages: pagesToGenerate })
            .then(() => {
              console.log("Bulk generation started for pages", pagesToGenerate);
              resourcesApi
                .getPage(resourceId, page, language)
                .then((data) => {
                  setAudioUrl(data.audioUrl);
                  setIsLoadingPage(false);
                })
                .catch(() => {
                  setIsLoadingPage(false);
                });
            })
            .catch((err) => {
              console.error("Error during bulk generation:", err);
              setIsLoadingPage(false);
            });
        } else {
          console.error("Error fetching page data:", error);
          setAudioUrl(null);
          setIsLoadingPage(false);
        }
      }
    },
    [resourceId, language]
  );

  // Load bookmarks on mount only
  useEffect(() => {
    loadBookmarks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Check bookmark when page changes
  useEffect(() => {
    checkCurrentPageBookmark(currentPage, bookmarks);
  }, [currentPage, bookmarks, checkCurrentPageBookmark]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchPageData(currentPage);
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [currentPage, fetchPageData]);

  const handleAudioEnded = useCallback(() => {
    if (isAutoplayEnabled) {
      setCurrentPage((prev) => prev + 1);
    }
  }, [isAutoplayEnabled]);

  async function handleReprocess() {
    if (isReprocessing) return;

    setIsReprocessing(true);
    setIsLoadingPage(true);

    try {
      // Force reprocess the current page
      await resourcesApi.bulkGeneratePages(resourceId, {
        pages: [{ page: currentPage, language, force: true }],
      });

      console.log(`Re-processing page ${currentPage}`);

      // Wait a bit for the generation to complete
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Fetch the updated page
      const data = await resourcesApi.getPage(resourceId, currentPage, language);
      setAudioUrl(data.audioUrl);
    } catch (error) {
      console.error("Error re-processing page:", error);
    } finally {
      setIsReprocessing(false);
      setIsLoadingPage(false);
    }
  }

  return (
    <>
      <div className="mb-8">
        <PdfViewer
          file={pdfUrl}
          mode="single"
          className=""
          page={currentPage}
          onPageChange={setCurrentPage}
        />
      </div>

      <div className="bg-white pb-4 dark:bg-black">
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
          <div className="space-y-2">
            <div className="relative z-10 flex items-center justify-between px-4 pb-2">
              <button
                onClick={toggleBookmark}
                disabled={isBookmarkLoading}
                className={
                  currentPageBookmark
                    ? "relative z-10 flex items-center gap-2 rounded bg-yellow-500 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-yellow-600 disabled:opacity-50 dark:bg-yellow-600 dark:hover:bg-yellow-700"
                    : "relative z-10 flex items-center gap-2 rounded bg-zinc-100 px-3 py-1.5 text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-200 disabled:opacity-50 dark:bg-zinc-800 dark:text-white dark:hover:bg-zinc-700"
                }
                title={currentPageBookmark ? `Bookmarked: ${currentPageBookmark.name}` : "Add bookmark"}
              >
                <svg
                  className="h-4 w-4"
                  fill={currentPageBookmark ? "currentColor" : "none"}
                  stroke="currentColor"
                  strokeWidth={2}
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
                  />
                </svg>
                <span className="hidden sm:inline">
                  {currentPageBookmark ? currentPageBookmark.name : "Bookmark"}
                </span>
              </button>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleReprocess}
                  disabled={isReprocessing || isLoadingPage}
                  className="relative z-10 flex items-center gap-2 rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-blue-500 dark:hover:bg-blue-600"
                  title="Re-process current page"
                >
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                  <span className="hidden sm:inline">
                    {isReprocessing ? "Re-processing..." : "Re-process"}
                  </span>
                </button>
                <button
                  onClick={() => setIsAutoplayEnabled(!isAutoplayEnabled)}
                  className={
                    isAutoplayEnabled
                      ? "relative z-10 flex items-center gap-2 rounded bg-green-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600"
                      : "relative z-10 flex items-center gap-2 rounded bg-zinc-100 px-3 py-1.5 text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-200 dark:bg-zinc-800 dark:text-white dark:hover:bg-zinc-700"
                  }
                  title={`Autoplay: ${isAutoplayEnabled ? "On" : "Off"}`}
                >
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <span className="hidden sm:inline">
                    Autoplay: {isAutoplayEnabled ? "On" : "Off"}
                  </span>
                </button>
              </div>
            </div>
            <Player
              audioUrl={audioUrl}
              onEnded={handleAudioEnded}
              autoplay={isAutoplayEnabled}
              volume={volume}
              playbackRate={playbackRate}
              onVolumeChange={setVolume}
              onPlaybackRateChange={setPlaybackRate}
            />
          </div>
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
