"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "./ui/button";
import { LoaderDotMatrix } from "./elements/loader-dot-matrix";
import { resourcesApi } from "@/lib/api";
import type { BookmarkResponse } from "@/lib/api/types";

interface BookmarksManagerProps {
  resourceId: string;
}

export function BookmarksManager({ resourceId }: BookmarksManagerProps) {
  const router = useRouter();
  const [bookmarks, setBookmarks] = useState<BookmarkResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    loadBookmarks();
  }, [resourceId]);

  const loadBookmarks = async () => {
    setIsLoading(true);
    try {
      const data = await resourcesApi.getBookmarks(resourceId);
      // Sort by page number
      const sortedBookmarks = data.bookmarks.sort((a, b) => a.page - b.page);
      setBookmarks(sortedBookmarks);
    } catch (error) {
      console.error("Error loading bookmarks:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (bookmarkId: string) => {
    setDeletingId(bookmarkId);
    try {
      await resourcesApi.deleteBookmark(resourceId, bookmarkId);
      setBookmarks(bookmarks.filter((b) => b.id !== bookmarkId));
    } catch (error) {
      console.error("Error deleting bookmark:", error);
    } finally {
      setDeletingId(null);
    }
  };

  const handleGoToBookmark = (page: number) => {
    router.push(`/resources/${resourceId}?page=${page}`);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex flex-col items-center gap-4">
          <LoaderDotMatrix rows={3} cols={5} dotSize={6} />
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Loading bookmarks...
          </p>
        </div>
      </div>
    );
  }

  if (bookmarks.length === 0) {
    return (
      <div className="border border-zinc-200 bg-white p-8 text-center dark:border-white/10 dark:bg-zinc-900">
        <div className="mb-4 flex justify-center">
          <svg
            className="h-16 w-16 text-zinc-400"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
            />
          </svg>
        </div>
        <h3 className="mb-2 text-lg font-semibold text-zinc-900 dark:text-white">
          No bookmarks yet
        </h3>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Add bookmarks while viewing pages to keep track of important sections
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="border border-zinc-200 bg-white dark:border-white/10 dark:bg-zinc-900">
        <div className="border-b border-zinc-200 bg-zinc-50 px-6 py-3 dark:border-white/10 dark:bg-zinc-800">
          <div className="grid grid-cols-12 gap-4 text-sm font-medium text-zinc-700 dark:text-zinc-300">
            <div className="col-span-1">Page</div>
            <div className="col-span-7">Name</div>
            <div className="col-span-4 text-right">Actions</div>
          </div>
        </div>
        <div className="divide-y divide-zinc-200 dark:divide-white/10">
          {bookmarks.map((bookmark) => (
            <div
              key={bookmark.id}
              className="grid grid-cols-12 gap-4 px-6 py-4 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800"
            >
              <div className="col-span-1 flex items-center">
                <span className="rounded bg-zinc-100 px-2 py-1 font-mono text-sm font-semibold text-zinc-900 dark:bg-zinc-800 dark:text-white">
                  {bookmark.page}
                </span>
              </div>
              <div className="col-span-7 flex items-center">
                <div className="flex items-center gap-2">
                  <svg
                    className="h-5 w-5 text-yellow-500"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                  </svg>
                  <span className="text-sm text-zinc-900 dark:text-white">
                    {bookmark.name}
                  </span>
                </div>
              </div>
              <div className="col-span-4 flex items-center justify-end gap-2">
                {deletingId === bookmark.id ? (
                  <div className="flex items-center gap-2">
                    <LoaderDotMatrix rows={1} cols={3} dotSize={4} />
                    <span className="text-sm text-zinc-600 dark:text-zinc-400">
                      Deleting...
                    </span>
                  </div>
                ) : (
                  <>
                    <Button
                      onClick={() => handleGoToBookmark(bookmark.page)}
                      className="bg-zinc-900 text-sm text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
                    >
                      Go to Page
                    </Button>
                    <Button
                      onClick={() => handleDelete(bookmark.id)}
                      className="bg-red-600 text-sm text-white hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800"
                    >
                      Delete
                    </Button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between rounded border border-zinc-200 bg-zinc-50 px-6 py-3 dark:border-white/10 dark:bg-zinc-800">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Total bookmarks: {bookmarks.length}
        </p>
        <Button
          onClick={() => router.push(`/resources/${resourceId}`)}
          className="bg-zinc-100 text-sm text-zinc-900 hover:bg-zinc-200 dark:bg-zinc-700 dark:text-white dark:hover:bg-zinc-600"
        >
          Back to Resource
        </Button>
      </div>
    </div>
  );
}
