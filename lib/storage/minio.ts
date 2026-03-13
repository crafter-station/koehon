import * as Minio from "minio";

// MinIO configuration from environment variables
const minioConfig = {
  endPoint: process.env.MINIO_ENDPOINT || "localhost",
  port: parseInt(process.env.MINIO_PORT || "443"),
  useSSL: process.env.MINIO_USE_SSL === "true",
  accessKey: process.env.MINIO_ACCESS_KEY || "",
  secretKey: process.env.MINIO_SECRET_KEY || "",
};

// Create MinIO client instance
export const minioClient = new Minio.Client(minioConfig);

// Default bucket name for PDFs
export const BUCKET_NAME = process.env.MINIO_BUCKET_NAME || "koehon-pdfs";

/**
 * Initialize MinIO storage - ensure bucket exists and is public
 */
export async function initializeStorage(): Promise<void> {
  try {
    const bucketExists = await minioClient.bucketExists(BUCKET_NAME);

    if (!bucketExists) {
      await minioClient.makeBucket(BUCKET_NAME, "us-east-1");
      console.log(`Bucket "${BUCKET_NAME}" created successfully`);

      // Set bucket policy to allow public read access (only on creation)
      const publicReadPolicy = {
        Version: "2012-10-17",
        Statement: [
          {
            Effect: "Allow",
            Principal: { AWS: ["*"] },
            Action: ["s3:GetObject"],
            Resource: [`arn:aws:s3:::${BUCKET_NAME}/*`],
          },
        ],
      };

      await minioClient.setBucketPolicy(
        BUCKET_NAME,
        JSON.stringify(publicReadPolicy)
      );
      console.log(`Bucket "${BUCKET_NAME}" policy set to public read`);
    }
  } catch (error) {
    console.error("Failed to initialize MinIO storage:", error);
    throw error;
  }
}

/**
 * Upload a file to MinIO
 */
export async function uploadFile(
  file: File,
  objectName: string
): Promise<{ url: string; etag: string }> {
  try {
    // Ensure bucket exists
    await initializeStorage();

    // Convert File to Buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // Upload to MinIO
    const result = await minioClient.putObject(
      BUCKET_NAME,
      objectName,
      buffer,
      file.size,
      {
        "Content-Type": file.type,
        "X-Original-Filename": file.name,
      }
    );

    // Generate public URL (or presigned URL if bucket is private)
    const url = await getFileUrl(objectName);

    return {
      url,
      etag: result.etag,
    };
  } catch (error) {
    console.error("Failed to upload file to MinIO:", error);
    throw new Error("Failed to upload file to storage");
  }
}

/**
 * Get file URL from MinIO
 */
export async function getFileUrl(objectName: string): Promise<string> {
  // If bucket is public, construct public URL
  if (minioConfig.useSSL) {
    return `https://${minioConfig.endPoint}/${BUCKET_NAME}/${objectName}`;
  }

  // Otherwise generate presigned URL (valid for 7 days)
  return await minioClient.presignedGetObject(
    BUCKET_NAME,
    objectName,
    7 * 24 * 60 * 60
  );
}

/**
 * Delete a file from MinIO
 */
export async function deleteFile(objectName: string): Promise<void> {
  try {
    await minioClient.removeObject(BUCKET_NAME, objectName);
  } catch (error) {
    console.error("Failed to delete file from MinIO:", error);
    throw new Error("Failed to delete file from storage");
  }
}

/**
 * Generate a unique object name for a file
 */
export function generateObjectName(
  userId: string,
  filename: string
): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(7);
  const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, "_");
  return `${userId}/${timestamp}-${random}-${sanitizedFilename}`;
}

/**
 * Extract object name from MinIO URL
 * URL format: https://endpoint/bucket/objectName
 */
export function extractObjectNameFromUrl(url: string): string | null {
  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split("/");
    // Remove empty strings and bucket name, rest is the object name
    const relevantParts = pathParts.filter(
      (part) => part && part !== BUCKET_NAME
    );
    return relevantParts.join("/");
  } catch (error) {
    console.error("Failed to extract object name from URL:", url, error);
    return null;
  }
}
