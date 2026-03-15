import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { ResourceCard } from "@/components/ui/resource-card";
import { Header } from "@/components/layout/header";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { getResources, getTotalAudioHours, getThisWeekAudioHours, getLatestBookmarksMap } from "./actions";

export default async function ResourcesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { userId } = await auth();

  // Redirect to sign-in if not authenticated
  if (!userId) {
    redirect("/sign-in");
  }

  // Get pagination parameters
  const params = await searchParams;
  const page = parseInt(params.page || "1");

  // Fetch resources and total audio hours using server actions
  const [{ resources, total, totalPages }, totalHours, thisWeekHours, bookmarksMap] = await Promise.all([
    getResources(page),
    getTotalAudioHours(),
    getThisWeekAudioHours(),
    getLatestBookmarksMap(),
  ]);

  return (
    <div className="min-h-screen bg-white dark:bg-black">
      <Header />

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12">
        <Breadcrumb items={[{ label: "Resources" }]} />

        {/* Page Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-zinc-900 dark:text-white">
              My Library
            </h1>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              {total} {total === 1 ? "resource" : "resources"} available
            </p>
          </div>
          <a
            href="/resources/new"
            className="bg-foreground px-4 py-2 text-sm font-medium text-background transition-colors hover:bg-foreground/90 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
          >
            + Add Resource
          </a>
        </div>
        {/* Stats Bar */}
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-white/10 dark:bg-zinc-900">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">Total Resources</p>
            <p className="mt-1 text-2xl font-bold text-zinc-900 dark:text-white">
              {total}
            </p>
          </div>
          <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-white/10 dark:bg-zinc-900">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">Total Hours Extracted</p>
            <p className="mt-1 text-2xl font-bold text-zinc-900 dark:text-white">
              {totalHours}
            </p>
          </div>
          <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-white/10 dark:bg-zinc-900">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">This Week</p>
            <p className="mt-1 text-2xl font-bold text-zinc-900 dark:text-white">
              {thisWeekHours}
            </p>
          </div>
        </div>

        {/* Resources Grid */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {resources.map((resource) => (
            <ResourceCard
              key={resource.id}
              resource={{
                id: resource.id,
                title: resource.title,
                coverUrl: resource.coverUrl,
                createdAt: resource.createdAt,
              }}
              lastBookmarkPage={bookmarksMap[resource.id]}
            />
          ))}
        </div>

        {/* Pagination */}
        {totalPages >= 1 && (
          <div className="mt-8 flex items-center justify-center gap-2">
            {page > 1 && (
              <a
                href={`/resources?page=${page - 1}`}
                className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white dark:hover:bg-zinc-800"
              >
                Previous
              </a>
            )}
            <span className="text-sm text-zinc-600 dark:text-zinc-400">
              Page {page} of {totalPages}
            </span>
            {page < totalPages && (
              <a
                href={`/resources?page=${page + 1}`}
                className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white dark:hover:bg-zinc-800"
              >
                Next
              </a>
            )}
          </div>
        )}

        {/* Empty State */}
        {total === 0 && (
          <div className="flex min-h-[400px] flex-col items-center justify-center text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-900">
              <svg
                className="h-8 w-8 text-zinc-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                />
              </svg>
            </div>
            <h3 className="mb-2 text-lg font-semibold text-zinc-900 dark:text-white">
              No resources yet
            </h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Upload your first document to get started
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
