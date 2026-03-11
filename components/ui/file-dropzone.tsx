"use client";

import { useCallback, useState } from "react";

interface FileDropzoneProps {
  onFileSelect: (file: File | null) => void;
  accept?: string;
  maxSize?: number; // in MB
}

export function FileDropzone({
  onFileSelect,
  accept = ".pdf",
  maxSize = 10,
}: FileDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const validateFile = (file: File): boolean => {
    setError(null);

    // Check file type
    if (!file.type.includes("pdf")) {
      setError("Only PDF files are allowed");
      return false;
    }

    // Check file size
    const fileSizeMB = file.size / (1024 * 1024);
    if (fileSizeMB > maxSize) {
      setError(`File size must be less than ${maxSize}MB`);
      return false;
    }

    return true;
  };

  const handleFile = (file: File) => {
    if (validateFile(file)) {
      setSelectedFile(file);
      onFileSelect(file);
    } else {
      setSelectedFile(null);
      onFileSelect(null);
    }
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFile(files[0]);
    }
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  };

  const clearFile = () => {
    setSelectedFile(null);
    setError(null);
    onFileSelect(null);
  };

  return (
    <div className="w-full">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
          isDragging
            ? "border-zinc-900 bg-zinc-50 dark:border-white dark:bg-zinc-900"
            : "border-zinc-300 dark:border-zinc-700"
        }`}
      >
        <input
          type="file"
          accept={accept}
          onChange={handleFileInput}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          id="file-upload"
        />

        {!selectedFile ? (
          <div className="pointer-events-none">
            <svg
              className="mx-auto h-12 w-12 text-zinc-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
            <p className="mt-4 text-sm font-medium text-zinc-900 dark:text-white">
              Drop your PDF here, or click to browse
            </p>
            <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
              Maximum file size: {maxSize}MB
            </p>
          </div>
        ) : (
          <div className="pointer-events-none flex items-center justify-center gap-3">
            <svg
              className="h-10 w-10 text-red-500"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" />
              <path d="M14 2v6h6" fill="none" stroke="white" strokeWidth={2} />
              <path d="M12 18v-6m-3 3h6" stroke="white" strokeWidth={2} strokeLinecap="round" />
            </svg>
            <div className="text-left">
              <p className="text-sm font-medium text-zinc-900 dark:text-white">
                {selectedFile.name}
              </p>
              <p className="text-xs text-zinc-600 dark:text-zinc-400">
                {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
              </p>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                clearFile();
              }}
              className="pointer-events-auto ml-auto rounded-full p-1 text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-white"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}
      </div>

      {error && (
        <p className="mt-2 text-sm text-red-500">{error}</p>
      )}
    </div>
  );
}
