import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { Header } from "@/components/layout/header";
import { BookmarksManager } from "@/components/bookmarks-manager";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { getResource } from "../../actions";

export default async function BookmarksPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in");
  }

  const { id } = await params;

  const resource = await getResource(id);

  if (!resource) {
    redirect("/resources");
  }

  return (
    <div className="min-h-screen bg-white dark:bg-black">
      <Header />
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <Breadcrumb
          items={[
            { label: "Resources", href: "/resources" },
            { label: resource.title, href: `/resources/${resource.id}` },
            { label: "Bookmarks" },
          ]}
        />

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-white">
            Bookmarks
          </h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Manage bookmarks for {resource.title}
          </p>
        </div>

        <BookmarksManager resourceId={resource.id} />
      </div>
    </div>
  );
}
