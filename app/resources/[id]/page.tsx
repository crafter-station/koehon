import { auth } from "@clerk/nextjs/server";
import { redirect, notFound } from "next/navigation";
import { Header } from "@/components/layout/header";
import { Player } from "@/components/ui/player";
import { getResource } from "../actions";

export default async function ResourcePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { userId } = await auth();

  // Redirect to sign-in if not authenticated
  if (!userId) {
    redirect("/sign-in");
  }

  // Get resource ID from params
  const { id } = await params;

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
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-white">
            {resource.title}
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            {resource.language.toUpperCase()} • Added{" "}
            {new Date(resource.createdAt).toLocaleDateString()}
          </p>
        </div>

        {/* PDF Viewer Area */}
        <div className="mb-8">
          <div className="aspect-[3/4] w-full border border-zinc-200 bg-zinc-50 dark:border-white/10 dark:bg-zinc-900">
            {/* PDF viewer will be added here later */}
            <div className="flex h-full items-center justify-center">
              <p className="text-sm text-zinc-400">PDF Viewer</p>
            </div>
          </div>
        </div>

        {/* Audio Player */}
        <div className="sticky bottom-0 bg-white pb-4 dark:bg-black">
          <Player audioUrl="https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3" />
        </div>
      </main>
    </div>
  );
}
