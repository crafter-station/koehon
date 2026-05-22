"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useUploadX } from "@uploadx-sdk/react";
import type { AppFileRouter } from "@/lib/uploadx";
import { apiClient } from "@/lib/api";
import type { ImportResourceResponse } from "@/lib/api/types";

export function ImportResourceButton() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { startUpload, isUploading, progress } = useUploadX<AppFileRouter>(
    "resourcePackageUploader",
    {
      onUploadError: (err) => {
        setError(err.message || "Upload failed");
        setIsImporting(false);
      },
      onClientUploadComplete: async (files) => {
        const key = files?.[0]?.key;
        if (!key) {
          setError("Upload completed without a file key");
          setIsImporting(false);
          return;
        }
        try {
          const result = await apiClient.post<ImportResourceResponse, { key: string }>(
            "/resources/import",
            { key }
          );
          router.push(`/resources/${result.resourceId}`);
          router.refresh();
        } catch (err) {
          if (err && typeof err === "object" && "error" in err) {
            setError((err as { error: string }).error);
          } else {
            setError("Failed to import resource");
          }
          setIsImporting(false);
        }
      },
    }
  );

  const handleClick = () => {
    setError(null);
    inputRef.current?.click();
  };

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setError(null);
    setIsImporting(true);
    await startUpload([file]);
  };

  const busy = isImporting || isUploading;
  const label = isUploading
    ? `Uploading ${progress}%`
    : isImporting
      ? "Importing..."
      : "Import Resource";

  return (
    <div className="flex flex-col items-end gap-1">
      <input
        ref={inputRef}
        type="file"
        accept=".zip,application/zip,application/x-zip-compressed"
        className="hidden"
        onChange={handleChange}
      />
      <button
        type="button"
        onClick={handleClick}
        disabled={busy}
        className="border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white dark:hover:bg-zinc-800"
      >
        {label}
      </button>
      {error && (
        <p className="max-w-xs text-right text-xs text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
