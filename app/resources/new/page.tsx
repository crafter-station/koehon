"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/layout/header";
import { FileDropzone } from "@/components/ui/file-dropzone";
import { LoaderDotMatrix } from "@/components/elements/loader-dot-matrix";
import { resourcesApi } from "@/lib/api";

const LANGUAGES = [
  { code: "en", name: "English" },
  { code: "es", name: "Spanish" },
];

export default function NewResourcePage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [language, setLanguage] = useState("en");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!file) {
      setError("Please select a file");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await resourcesApi.create({
        file,
        language,
      });
      router.push("/resources");
    } catch (err) {
      if (err && typeof err === "object" && "error" in err) {
        setError(err.error as string);
      } else {
        setError("An error occurred");
      }
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-black">
      <Header />

      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-white">
            Add New Resource
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Upload a PDF document to add to your library
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* File Upload */}
          <div>
            <label className="mb-2 block text-sm font-medium text-zinc-900 dark:text-white">
              Document File
            </label>
            <FileDropzone onFileSelect={setFile} />
          </div>

          {/* Language Select */}
          <div>
            <label
              htmlFor="language"
              className="mb-2 block text-sm font-medium text-zinc-900 dark:text-white"
            >
              Language
            </label>
            <select
              id="language"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="w-full rounded-lg border border-zinc-200 bg-white px-4 py-2.5 text-sm text-zinc-900 transition-colors focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white dark:focus:border-white dark:focus:ring-white/20"
            >
              {LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.name}
                </option>
              ))}
            </select>
          </div>

          {/* Error Message */}
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900/50 dark:bg-red-900/10">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          {/* Buttons / Loader */}
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-8">
              <LoaderDotMatrix rows={3} cols={5} dotSize={6} />
              <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">
                Uploading your resource...
              </p>
            </div>
          ) : (
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => router.push("/resources")}
                className="flex-1 rounded-lg border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white dark:hover:bg-zinc-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!file}
                className="flex-1 bg-foreground px-4 py-2.5 text-sm font-medium text-background transition-colors hover:bg-foreground/90 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
              >
                Upload Resource
              </button>
            </div>
          )}
        </form>
      </main>
    </div>
  );
}
