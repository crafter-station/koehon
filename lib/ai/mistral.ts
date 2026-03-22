import { Mistral } from '@mistralai/mistralai';
import { Extractor } from "./interfaces";
import { extractPage } from '../pdf-utils.server';

export class MistralExtractor extends Extractor {
  constructor(private customApiKey?: string) {
    super();
  }

  async extractPageTextWithImages(pdfFile: File, pageNumber: number): Promise<string> {
    const pageBlob = await extractPage(pdfFile, pageNumber);

    const apiKey = this.customApiKey || process.env.MISTRAL_API_KEY;
    const client = new Mistral({apiKey: apiKey});

    const { id } = await client.files.upload({
      file: {
        fileName: `page-${pageNumber}.pdf`,
        content: pageBlob,
      },
    })

    const { pages } = await client.ocr.process({
      model: "mistral-ocr-latest",
      document: {
          type: "file",
          fileId: id,
      },
      tableFormat: "markdown",
      includeImageBase64: true
    });

    return pages.map((page) => {
      return page.markdown + page.images.reduce((prev, curr) => {
        if (!curr.imageBase64) {
          return prev;
        }

        return prev + `\n[IMAGE: ${curr.imageBase64}]`;
      }, "")
    }).join("\n");
  }
}
