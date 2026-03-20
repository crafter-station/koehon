import { db } from "@/lib/db";
import { userApiKeys } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { decrypt } from "@/lib/encryption";
import { AI_PROVIDERS } from "./config/providers";

/**
 * Get a user's custom API key for a specific provider
 * Returns the decrypted API key or null if not found
 */
export async function getUserApiKey(
  userId: string,
  provider: string = AI_PROVIDERS.OPEN_AI,
): Promise<string | null> {
  try {
    const [apiKey] = await db
      .select({
        apiKey: userApiKeys.apiKey,
      })
      .from(userApiKeys)
      .where(and(eq(userApiKeys.userId, userId), eq(userApiKeys.provider, provider)))
      .limit(1);

    if (!apiKey) {
      return null;
    }

    // Decrypt the API key before returning
    return decrypt(apiKey.apiKey);
  } catch (error) {
    console.error(`Error retrieving API key for user ${userId}:`, error);
    return null;
  }
}

export async function getApiKey(userId: string, provider: string): Promise<string> {
  const customKey = await getUserApiKey(userId, provider);

  switch (provider) {
    case AI_PROVIDERS.OPEN_AI:
      return customKey || process.env.OPENAI_API_KEY || "";
    case AI_PROVIDERS.GEMINI:
      return customKey || process.env.GEMINI_API_KEY || "";
    default:
      throw new Error(`Unsupported provider: ${provider}`);
  }
}
