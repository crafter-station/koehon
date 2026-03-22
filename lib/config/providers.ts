export const AI_PROVIDERS = {
  OPEN_AI: "openai",
  GEMINI: "gemini",
  MISTRAL: "mistral",
} as const;

export const PROVIDER_LABELS: Record<string, string> = {
  [AI_PROVIDERS.OPEN_AI]: "OpenAI",
  [AI_PROVIDERS.GEMINI]: "Google Gemini",
  [AI_PROVIDERS.MISTRAL]: "Mistral",
};

/** Available providers per AI function */
export const AVAILABLE_PROVIDERS = {
  extractor: [AI_PROVIDERS.OPEN_AI, AI_PROVIDERS.MISTRAL],
  cleaner: [AI_PROVIDERS.OPEN_AI],
  translator: [AI_PROVIDERS.OPEN_AI, AI_PROVIDERS.GEMINI],
  audio_generator: [AI_PROVIDERS.OPEN_AI, AI_PROVIDERS.GEMINI],
} as const;
