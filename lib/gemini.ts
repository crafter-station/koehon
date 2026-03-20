import { GoogleGenAI, Modality } from "@google/genai";

export async function translateText(
  text: string,
  targetLanguage: string,
  customApiKey?: string
): Promise<string> {
  if (!text) throw new Error("No text provided for translation.");

  const ai = new GoogleGenAI({ apiKey: customApiKey || process.env.GEMINI_API_KEY });
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: {
      parts: [{
        text: `<role>You are an expert translator</role>
<task>Translate the input text to ${targetLanguage} language.</task>
<input>${text}</input>
<output>Only retrieve the translated text. Preserve [IMAGE: ...] descriptions as-is.</output>`
      }]
    },
  });

  const translated = response.text;
  if (!translated) {
    throw new Error("No translation received from Gemini");
  }

  return translated.trim();
}

export async function generateAudio(
  text: string,
  customApiKey?: string
): Promise<Blob> {
  const ai = new GoogleGenAI({ apiKey: customApiKey || process.env.GEMINI_API_KEY });
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: { parts: [{ text: text }] },
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: { prebuiltVoiceConfig: { voiceName: "Puck" } },
      },
    },
  });

  const audioData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (!audioData) {
    throw new Error("No audio data received from Gemini");
  }

  const rawBytes = decodeBase64(audioData);
  const blob = new Blob([rawBytes], { type: 'audio/mpeg' });

  return blob;
}

function decodeBase64(base64: string): Uint8Array<ArrayBuffer> {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const buffer = new ArrayBuffer(len);
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}
