import { auth } from "@clerk/nextjs/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/layout/header";
import { ResourceViewer } from "@/components/resource-viewer";
import { getResource } from "../actions";

export default async function ResourcePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { userId } = await auth();

  // Redirect to sign-in if not authenticated
  if (!userId) {
    redirect("/sign-in");
  }

  // Get resource ID from params
  const { id } = await params;

  // Get initial page from search params
  const { page } = await searchParams;
  const initialPage = page ? parseInt(page, 10) : 1;

  // Fetch resource
  const resource = await getResource(id);

  // Show 404 if resource not found or doesn't belong to user
  if (!resource) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-white dark:bg-black">
      <Header />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12">
        {/* Page Header */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-zinc-900 dark:text-white">
              {resource.title}
            </h1>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              {resource.language.toUpperCase()} • Added{" "}
              {new Date(resource.createdAt).toLocaleDateString()}
            </p>
          </div>
          <div className="flex gap-4">
            <Link
              href={`/resources/${resource.id}/bookmarks`}
              className="text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
            >
              Bookmarks
            </Link>
            <Link
              href={`/resources/${resource.id}/settings`}
              className="text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
            >
              Settings
            </Link>
          </div>
        </div>

        {/* Resource Viewer with PDF and Audio Player */}
        <div className="mx-auto max-w-5xl">
          <ResourceViewer
            resourceId={resource.id}
            pdfUrl={resource.pdfUrl}
            language={resource.language}
            initialPage={initialPage}
          />
        </div>
      </main>
    </div>
  );
}
