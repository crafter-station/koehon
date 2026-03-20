import { createOpenAI } from "@ai-sdk/openai";
import { experimental_generateSpeech, generateText } from "ai";
import { OpenAI } from "openai";
import { extractPage } from "@/lib/pdf-utils.server";
import { AudioGenerator, Extractor, Translator } from "./interfaces";

/**
 * Create an OpenAI client instance
 * Uses custom API key if provided, otherwise falls back to default
 */
function getOpenAIClient(customApiKey?: string): OpenAI {
  return new OpenAI({
    apiKey: customApiKey || process.env.OPENAI_API_KEY,
  });
}

/**
 * Create an AI SDK OpenAI provider instance
 * Uses custom API key if provided, otherwise falls back to default
 */
function getAISDKProvider(customApiKey?: string) {
  return createOpenAI({
    apiKey: customApiKey || process.env.OPENAI_API_KEY,
  });
}

export class OpenAiExtractor extends Extractor {
  constructor(private customApiKey?: string) {
    super();
  }

  async extractPageTextWithImages(
    pdfFile: File,
    pageNumber: number,
  ): Promise<string> {
    const client = getOpenAIClient(this.customApiKey);
    const pageBlob = await extractPage(pdfFile, pageNumber);
    const buffer = Buffer.from(await pageBlob.arrayBuffer());
    const base64Pdf = buffer.toString("base64");

    const response = await client.responses.create({
      model: "gpt-4o",
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: this.instructions(),
            },
            {
              type: "input_file",
              filename: `page-${pageNumber}.pdf`,
              file_data: `data:application/pdf;base64,${base64Pdf}`,
            },
          ],
        },
      ],
    });

    return response.output
      .filter((item) => item.type === "message")
      .map((item) => {
        return item.content
          .map((content) => {
            if (content.type === "output_text") {
              return content.text;
            }
            return "";
          })
          .join("\n");
      })
      .join("\n");
  }
}

export class OpenAiTranslator extends Translator {
  constructor(private customApiKey?: string) {
    super();
  }

  async translateText(
    text: string,
    targetLanguage: string,
  ): Promise<string> {
    if (!text) throw new Error("No text provided for translation.");

    const openaiProvider = getAISDKProvider(this.customApiKey);

    const { text: translated } = await generateText({
      model: openaiProvider("gpt-4o-mini"),
      prompt: this.instructions(text, targetLanguage),
    });

    return translated.trim();
  }
}

export class OpenAiAudioGenerator extends AudioGenerator {
  constructor(private customApiKey?: string) {
    super();
  }

  async generateAudio(
    text: string,
  ): Promise<Blob> {
    const openaiProvider = getAISDKProvider(this.customApiKey);

    const audio = await experimental_generateSpeech({
      model: openaiProvider.speech("gpt-4o-mini-tts-2025-12-15"),
      text: text,
      voice: "alloy",
    });

    const uint8Array = await audio.audio.uint8Array;
    return new Blob([new Uint8Array(uint8Array)], { type: "audio/mpeg" });
  }
}
