import { createUploadx } from "@uploadx-sdk/core/server";
import type { FileRouter } from "@uploadx-sdk/core/server";
import { auth } from "@clerk/nextjs/server";

const f = createUploadx();

export const fileRouter = {
  // Direct-to-storage upload for resource package ZIPs. The browser PUTs the
  // file straight into Uploadx storage via a presigned URL — our Next.js
  // server (and any proxy in front of it) never sees the bytes. The actual
  // import happens later via POST /api/resources/import { key }.
  resourcePackageUploader: f({ blob: { maxFileSize: "1GB" } })
    .middleware(async () => {
      const { userId } = await auth();
      if (!userId) {
        throw new Error("Unauthorized");
      }
      return { userId };
    })
    .onUploadComplete(({ metadata, file }) => {
      return { key: file.key, userId: metadata.userId };
    }),
} satisfies FileRouter;

export type AppFileRouter = typeof fileRouter;
