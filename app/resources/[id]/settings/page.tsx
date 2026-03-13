import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { Header } from "@/components/layout/header";
import { ResourceSettingsForm } from "@/components/resource-settings-form";
import { getResourceWithLoadedPages } from "../../actions";

export default async function ResourceSettingsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in");
  }

  const { id } = await params;

  const data = await getResourceWithLoadedPages(id);

  if (!data) {
    redirect("/resources");
  }

  const { resource, loadedPages } = data;

  return (
    <div className="min-h-screen bg-white dark:bg-black">
      <Header />
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-white">
            Resource Settings
          </h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Update resource details and pre-load pages
          </p>
        </div>

        <ResourceSettingsForm
          resourceId={resource.id}
          currentTitle={resource.title}
          defaultLanguage={resource.language}
          loadedPages={loadedPages}
        />
      </div>
    </div>
  );
}
