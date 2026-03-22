import { AI_PROVIDERS } from "../config/providers";
import { GeminiAudioGenerator, GeminiTranslator } from "./gemini";
import { AudioGenerator, Extractor, Translator } from "./interfaces";
import { MistralExtractor } from "./mistral";
import { OpenAiAudioGenerator, OpenAiExtractor, OpenAiTranslator } from "./openai";

export function newExtractor(provider: string, customApiKey?: string): Extractor {
  switch (provider) {
    case AI_PROVIDERS.OPEN_AI:
      return new OpenAiExtractor(customApiKey);
    case AI_PROVIDERS.MISTRAL:
      return new MistralExtractor(customApiKey);
    default:
      throw new Error(`Unsupported provider: ${provider}`);
  }
}

export function newTranslator(provider: string, customApiKey?: string): Translator {
  switch (provider) {
    case AI_PROVIDERS.GEMINI:
      return new GeminiTranslator(customApiKey);
    case AI_PROVIDERS.OPEN_AI:
      return new OpenAiTranslator(customApiKey);
    default:
      throw new Error(`Unsupported provider: ${provider}`);
  }
}

export function newAudioGenerator(provider: string, customApiKey?: string): AudioGenerator {
  switch (provider) {
    case AI_PROVIDERS.GEMINI:
      return new GeminiAudioGenerator(customApiKey);
    case AI_PROVIDERS.OPEN_AI:
      return new OpenAiAudioGenerator(customApiKey);
    default:
      throw new Error(`Unsupported provider: ${provider}`);
  }
}
