import { Mistral } from '@mistralai/mistralai';
import { Extractor } from "./interfaces";
import { extractPageAsJpgPath } from '../pdf-utils.server';
import { readFileSync, unlinkSync } from 'fs';
import { deleteFile, uploadFile } from '../storage/minio';

export class MistralExtractor extends Extractor {
  constructor(private customApiKey?: string) {
    super();
  }

  async extractPageTextWithImages(pdfFile: File, pageNumber: number): Promise<string> {
    const pagePath = await extractPageAsJpgPath(pdfFile, pageNumber);
    const objectName = `ocr/${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;

    try {
      const buffer = readFileSync(pagePath);
      const file = new File([buffer], `ss-${pageNumber}-${Date.now().toString()}-${Math.random().toString(36).substring(7)}.jpg`, { type: 'image/jpeg' });
      const { url: documentUrl } = await uploadFile(file, objectName);

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
      try {
        await deleteFile(objectName);
      } catch {}
    }
  }
}
