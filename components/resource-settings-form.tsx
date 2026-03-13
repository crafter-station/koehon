"use client";

import { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { LoaderDotMatrix } from "./elements/loader-dot-matrix";
import { resourcesApi } from "@/lib/api";

interface LoadedPage {
  page: number;
  language: string;
}

interface ResourceSettingsFormProps {
  resourceId: string;
  currentTitle: string;
  defaultLanguage: string;
  loadedPages: LoadedPage[];
}

function parsePageRanges(input: string): number[] {
  const pages = new Set<number>();
  const parts = input.split(",").map((p) => p.trim());

  for (const part of parts) {
    if (part.includes("-")) {
      const [start, end] = part.split("-").map((n) => parseInt(n.trim(), 10));
      if (!isNaN(start) && !isNaN(end) && start <= end) {
        for (let i = start; i <= end; i++) {
          pages.add(i);
        }
      }
    } else {
      const page = parseInt(part, 10);
      if (!isNaN(page)) {
        pages.add(page);
      }
    }
  }

  return Array.from(pages).sort((a, b) => a - b);
}

function groupPagesIntoRanges(pages: number[]): string {
  if (pages.length === 0) return "";

  const sorted = [...pages].sort((a, b) => a - b);
  const ranges: string[] = [];
  let start = sorted[0];
  let end = sorted[0];

  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] === end + 1) {
      end = sorted[i];
    } else {
      ranges.push(start === end ? `${start}` : `${start}-${end}`);
      start = sorted[i];
      end = sorted[i];
    }
  }

  ranges.push(start === end ? `${start}` : `${start}-${end}`);
  return ranges.join(", ");
}

export function ResourceSettingsForm({
  resourceId,
  currentTitle,
  defaultLanguage,
  loadedPages,
}: ResourceSettingsFormProps) {
  const [title, setTitle] = useState(currentTitle);
  const [pageRanges, setPageRanges] = useState("");
  const [language, setLanguage] = useState(defaultLanguage);
  const [isUpdatingTitle, setIsUpdatingTitle] = useState(false);
  const [isPreloading, setIsPreloading] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const groupedLoadedPages = loadedPages.reduce(
    (acc, { page, language }) => {
      if (!acc[language]) {
        acc[language] = [];
      }
      acc[language].push(page);
      return acc;
    },
    {} as Record<string, number[]>
  );

  const handleUpdateTitle = async () => {
    if (!title.trim()) {
      setMessage({ type: "error", text: "Title cannot be empty" });
      return;
    }

    setIsUpdatingTitle(true);
    setMessage(null);

    try {
      await resourcesApi.updateTitle(resourceId, title);
      setMessage({ type: "success", text: "Title updated successfully" });
    } catch (error) {
      setMessage({ type: "error", text: "Failed to update title" });
    } finally {
      setIsUpdatingTitle(false);
    }
  };

  const handlePreloadPages = async () => {
    if (!pageRanges.trim()) {
      setMessage({ type: "error", text: "Please enter page ranges" });
      return;
    }

    const pages = parsePageRanges(pageRanges);
    if (pages.length === 0) {
      setMessage({
        type: "error",
        text: "Invalid page ranges. Use format like: 1-8, 10, 60-66",
      });
      return;
    }

    setIsPreloading(true);
    setMessage(null);

    try {
      const response = await resourcesApi.bulkGeneratePages(resourceId, {
        pages: pages.map((page) => ({ page, language })),
      });

      const successCount = response.pages.length;
      const errorCount = response.errors?.length || 0;

      if (errorCount > 0) {
        setMessage({
          type: "error",
          text: `Pre-loaded ${successCount} pages, ${errorCount} failed`,
        });
      } else {
        setMessage({
          type: "success",
          text: `Successfully pre-loaded ${successCount} pages`,
        });
        setPageRanges("");
      }

      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error) {
      setMessage({ type: "error", text: "Failed to pre-load pages" });
    } finally {
      setIsPreloading(false);
    }
  };

  return (
    <div className="space-y-6">
      {message && (
        <div
          className={`border p-4 ${
            message.type === "success"
              ? "border-green-500 bg-green-50 text-green-900 dark:bg-green-950 dark:text-green-100"
              : "border-red-500 bg-red-50 text-red-900 dark:bg-red-950 dark:text-red-100"
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="border border-zinc-200 bg-white p-6 dark:border-white/10 dark:bg-zinc-900">
        <h2 className="mb-4 text-xl font-semibold text-zinc-900 dark:text-white">
          Update Title
        </h2>
        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Resource Title
            </label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter resource title"
            />
          </div>
          <div>
            <Button onClick={handleUpdateTitle} disabled={isUpdatingTitle}>
              {isUpdatingTitle ? "Updating..." : "Update Title"}
            </Button>
          </div>
        </div>
      </div>

      <div className="border border-zinc-200 bg-white p-6 dark:border-white/10 dark:bg-zinc-900">
        <h2 className="mb-2 text-xl font-semibold text-zinc-900 dark:text-white">
          Pre-Load Pages
        </h2>
        <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">
          Enter page ranges to pre-load (e.g., 1-8, 10, 60-66)
        </p>
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Page Ranges
              </label>
              <Input
                value={pageRanges}
                onChange={(e) => setPageRanges(e.target.value)}
                placeholder="1-8, 10, 60-66"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Language
              </label>
              <Input
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                placeholder="en, es, fr..."
              />
            </div>
          </div>
          <div>
            <Button onClick={handlePreloadPages} disabled={isPreloading}>
              {isPreloading ? "Pre-loading..." : "Pre-load Pages"}
            </Button>
          </div>
        </div>
        {isPreloading && (
          <div className="mt-4 flex items-center gap-3 rounded border border-zinc-200 bg-zinc-50 p-4 dark:border-white/10 dark:bg-zinc-800">
            <LoaderDotMatrix rows={3} cols={5} dotSize={6} />
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Generating pages...
            </p>
          </div>
        )}
      </div>

      <div className="border border-zinc-200 bg-white p-6 dark:border-white/10 dark:bg-zinc-900">
        <h2 className="mb-4 text-xl font-semibold text-zinc-900 dark:text-white">
          Loaded Pages
        </h2>
        {Object.keys(groupedLoadedPages).length === 0 ? (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            No pages loaded yet
          </p>
        ) : (
          <div className="space-y-2">
            {Object.entries(groupedLoadedPages).map(([lang, pages]) => (
              <div
                key={lang}
                className="flex items-baseline gap-4 rounded border border-zinc-200 bg-zinc-50 p-3 dark:border-white/10 dark:bg-zinc-800"
              >
                <span className="min-w-[3rem] font-mono text-sm font-semibold uppercase text-zinc-900 dark:text-white">
                  {lang}:
                </span>
                <span className="font-mono text-sm text-zinc-600 dark:text-zinc-400">
                  {groupPagesIntoRanges(pages)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
