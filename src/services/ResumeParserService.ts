import fs from 'fs/promises';
import path from 'path';
import { ValidationError, InternalServerError, EmptyResumeError } from '../utils/errors';
import { cleanText as normalizeText } from '../utils/textCleaner';

const _pdfParseModule = require('pdf-parse') as any;

async function invokePdfParse(buffer: Buffer): Promise<{ text?: string }> {
  // If module exports a PDFParse class (new API), instantiate and use it
  if (typeof _pdfParseModule?.PDFParse === 'function') {
    const PDFParseClass = _pdfParseModule.PDFParse as any;
    const instance = new PDFParseClass({ data: buffer });
    if (typeof instance.load === 'function') {
      await instance.load();
    }
    if (typeof instance.getText === 'function') {
      const result = await instance.getText();
      if (typeof result === 'string') return { text: result };
      if (result && typeof result.text === 'string') return { text: result.text };
      if (result && Array.isArray(result.pages)) {
        const joined = result.pages.map((p: any) => p.text || '').join('\n\n');
        return { text: joined };
      }
      return { text: String(result) };
    }
    // fallback: some versions expose getText as property returning string
    return { text: String(instance) };
  }

  // If module itself is a function (older pdf-parse), call it directly
  if (typeof _pdfParseModule === 'function') {
    return await _pdfParseModule(buffer);
  }

  // If default export is a function
  if (typeof _pdfParseModule?.default === 'function') {
    return await _pdfParseModule.default(buffer);
  }

  // If there's a parse helper
  if (typeof _pdfParseModule?.parse === 'function') {
    return await _pdfParseModule.parse(buffer);
  }

  throw new InternalServerError('Unable to locate a callable PDF parsing function on pdf-parse module');
}

export class ResumeParserService {
  constructor() {}

  async extractTextFromPdf(filePath: string): Promise<string> {
    if (!filePath || typeof filePath !== 'string') {
      throw new ValidationError('filePath must be a non-empty string');
    }

    const resolvedPath = path.isAbsolute(filePath)
      ? filePath
      : path.resolve(process.cwd(), filePath);

    try {
      await fs.access(resolvedPath);
    } catch (error) {
      throw new ValidationError(`PDF file not found at path: ${resolvedPath}`, error);
    }

    try {
      const fileBuffer = await fs.readFile(resolvedPath);
        const pdfData = await invokePdfParse(fileBuffer);
      const text = typeof pdfData.text === 'string' ? pdfData.text : '';

      if (!text.trim()) {
        throw new EmptyResumeError('Resume extraction failed or returned empty text');
      }

      return text.trim();
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new InternalServerError(`Failed to extract text from PDF: ${error instanceof Error ? error.message : String(error)}`, error);
    }
  }

  cleanText(text: string): string {
    return normalizeText(text);
  }
}
