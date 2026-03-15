"use client";

import Link from "next/link";
import type { Resource } from "@/lib/data/resources";

interface ResourceCardProps {
  resource: Resource;
  lastBookmarkPage?: number;
}

export function ResourceCard({ resource, lastBookmarkPage }: ResourceCardProps) {
  const formattedDate = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(resource.createdAt);

  const href = lastBookmarkPage
    ? `/resources/${resource.id}?page=${lastBookmarkPage}`
    : `/resources/${resource.id}`;

  return (
    <Link
      href={href}
      className="group relative block overflow-hidden border border-zinc-200 bg-white transition-all hover:shadow-lg dark:border-white/10 dark:bg-zinc-900"
    >
      {/* Cover Image */}
      <div className="relative aspect-[3/4] overflow-hidden bg-zinc-100 dark:bg-zinc-800">
        <img
          src={resource.coverUrl}
          alt={resource.title}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />

        {/* Bookmark Indicator */}
        {lastBookmarkPage && (
          <div className="absolute left-2 top-2 flex items-center gap-1 rounded bg-yellow-500 px-2 py-1 text-xs font-medium text-white shadow-md">
            <svg
              className="h-3 w-3"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
            </svg>
            <span>p.{lastBookmarkPage}</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-3">
        <h3 className="mb-1 line-clamp-1 text-sm font-semibold text-zinc-900 dark:text-white">
          {resource.title}
        </h3>
        <p className="text-xs text-zinc-600 dark:text-zinc-400">
          {formattedDate}
        </p>
      </div>

      {/* Hover Actions */}
      <div className="absolute right-2 top-2 opacity-0 transition-opacity group-hover:opacity-100">
        <button
          className="flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-zinc-900 backdrop-blur-sm transition-colors hover:bg-white dark:bg-zinc-800/90 dark:text-white dark:hover:bg-zinc-800"
          aria-label="Play audio"
          onClick={(e) => e.preventDefault()}
        >
          <svg
            className="h-3.5 w-3.5"
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
        </button>
      </div>
    </Link>
  );
}
