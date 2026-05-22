import { Mistral } from '@mistralai/mistralai';
import { Extractor } from "./interfaces";
import { extractPageAsJpgPath } from '../pdf-utils.server';
import { readFileSync, unlinkSync } from 'fs';
import { deleteFile, uploadFile, getSignedDownloadUrl } from '../storage/uploadx';

export class MistralExtractor extends Extractor {
  constructor(private customApiKey?: string) {
    super();
  }

  async extractPageTextWithImages(pdfFile: File, pageNumber: number): Promise<string> {
    const pagePath = await extractPageAsJpgPath(pdfFile, pageNumber);
    let uploadedKey: string | null = null;

    try {
      const buffer = readFileSync(pagePath);
      const file = new File(
        [buffer],
        `ocr-${pageNumber}-${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`,
        { type: 'image/jpeg' }
      );
      // Mistral's OCR endpoint fetches the document from documentUrl, so it must
      // be reachable from Mistral's network — use a signed storage URL, not the
      // relative /api/uploadx/f/<key> route (which only works inside our app).
      const uploaded = await uploadFile(file);
      uploadedKey = uploaded.key;
      const documentUrl = await getSignedDownloadUrl(uploaded.key);

      const apiKey = this.customApiKey || process.env.MISTRAL_API_KEY;
      const client = new Mistral({ apiKey });

      const { pages } = await client.ocr.process({
        model: "mistral-ocr-latest",
        document: {
          type: "document_url",
          documentUrl,
        },
        tableFormat: "markdown",
        includeImageBase64: true,
      });

      return pages.map((page) => {
        return page.markdown + page.images.reduce((prev, curr) => {
          if (!curr.imageBase64) {
            return prev;
          }

          return prev + `\n[IMAGE: ${curr.imageBase64}]`;
        }, "");
      }).join("\n");
    } finally {
      try {
        unlinkSync(pagePath);
      } catch {}
      if (uploadedKey) {
        try {
          await deleteFile(uploadedKey);
        } catch {}
      }
    }
  }
}
