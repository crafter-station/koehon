"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { Header } from "@/components/layout/header";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AI_PROVIDERS } from "@/lib/config/providers";

interface ApiKey {
  id: string;
  provider: string;
  apiKey: string;
  apiKeyMasked: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function SettingsPage() {
  const { isLoaded, userId } = useAuth();
  const router = useRouter();
  const [apiKey, setApiKey] = useState("");
  const [existingKey, setExistingKey] = useState<ApiKey | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Redirect to sign-in if not authenticated
  useEffect(() => {
    if (isLoaded && !userId) {
      router.push("/sign-in");
    }
  }, [isLoaded, userId, router]);

  // Fetch existing API keys
  useEffect(() => {
    if (userId) {
      fetchApiKeys();
    }
  }, [userId]);

  const fetchApiKeys = async () => {
    try {
      const response = await fetch("/api/user/api-keys");
      if (response.ok) {
        const data = await response.json();
        const openAiKey = data.apiKeys.find(
          (k: ApiKey) => k.provider === AI_PROVIDERS.OPEN_AI,
        );
        setExistingKey(openAiKey || null);
      }
    } catch (error) {
      console.error("Error fetching API keys:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch("/api/user/api-keys", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          apiKey,
          provider: AI_PROVIDERS.OPEN_AI,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({
          type: "success",
          text: existingKey
            ? "API key updated successfully"
            : "API key saved successfully",
        });
        setApiKey("");
        await fetchApiKeys();
      } else {
        setMessage({
          type: "error",
          text: data.error || "Failed to save API key",
        });
      }
    } catch (error) {
      setMessage({
        type: "error",
        text: "An error occurred. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete your API key?")) {
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch("/api/user/api-keys?provider=openai", {
        method: "DELETE",
      });

      if (response.ok) {
        setMessage({
          type: "success",
          text: "API key deleted successfully",
        });
        setExistingKey(null);
      } else {
        const data = await response.json();
        setMessage({
          type: "error",
          text: data.error || "Failed to delete API key",
        });
      }
    } catch (error) {
      setMessage({
        type: "error",
        text: "An error occurred. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!isLoaded || !userId) {
    return null;
  }

  return (
    <div className="min-h-screen bg-white dark:bg-black">
      <Header />

      <main className="container mx-auto max-w-4xl px-4 py-8">
        <Breadcrumb items={[{ label: "Settings" }]} />

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-white">
            Settings
          </h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Manage your account settings and preferences
          </p>
        </div>

        <div className="space-y-6">
          {/* Message Display */}
          {message && (
            <div
              className={`border p-4 ${
                message.type === "success"
                  ? "border-green-500 bg-green-50 text-green-900 dark:bg-green-950 dark:text-green-100"
                  : "border-red-500 bg-red-50 text-red-900 dark:bg-red-950 dark:text-red-100"
              }`}
            >
              {message.text}
            </div>
          )}

          {/* API Keys Section */}
          <div className="border border-zinc-200 bg-white p-6 dark:border-white/10 dark:bg-zinc-900">
            <h2 className="mb-2 text-xl font-semibold text-zinc-900 dark:text-white">
              OpenAI API Key
            </h2>
            <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">
              Use your own OpenAI API key to process documents. If not provided,
              the default key will be used.
            </p>

            {/* Current API Key Display */}
            {existingKey && (
              <div className="mb-6 border border-zinc-200 bg-zinc-50 p-4 dark:border-white/10 dark:bg-zinc-800">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-medium text-zinc-900 dark:text-white">
                    Current API Key
                  </span>
                  <button
                    onClick={handleDelete}
                    disabled={loading}
                    className="text-sm text-red-600 hover:text-red-700 disabled:opacity-50 dark:text-red-400 dark:hover:text-red-300"
                  >
                    Delete
                  </button>
                </div>
                <code className="block text-sm text-zinc-600 dark:text-zinc-400">
                  {existingKey.apiKey}
                </code>
                <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-500">
                  Last updated:{" "}
                  {new Date(existingKey.updatedAt).toLocaleDateString()}
                </p>
              </div>
            )}

            {/* API Key Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="apiKey"
                  className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
                >
                  {existingKey ? "Update API Key" : "Add API Key"}
                </label>
                <Input
                  type="password"
                  id="apiKey"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="sk-..."
                  disabled={loading}
                />
                <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-500">
                  Your API key will be stored securely and encrypted
                </p>
              </div>

              <div>
                <Button type="submit" disabled={loading || !apiKey.trim()}>
                  {loading ? "Saving..." : existingKey ? "Update Key" : "Save Key"}
                </Button>
              </div>
            </form>
          </div>

          {/* Additional Information */}
          <div className="border border-zinc-200 bg-zinc-50 p-4 dark:border-white/10 dark:bg-zinc-800">
            <h3 className="mb-2 text-sm font-semibold text-zinc-900 dark:text-white">
              Why add your own API key?
            </h3>
            <ul className="list-inside list-disc space-y-1 text-sm text-zinc-600 dark:text-zinc-400">
              <li>No usage limits or restrictions</li>
              <li>Direct billing to your OpenAI account</li>
              <li>Full control over your API usage</li>
              <li>Access to latest OpenAI models and features</li>
            </ul>
          </div>
        </div>
      </main>
    </div>
  );
}
