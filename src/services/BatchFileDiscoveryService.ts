import fs from 'fs';
import path from 'path';
import { ValidationError } from '../utils/errors';
import { getLogger } from './LoggingService';

const logger = getLogger();

export class BatchFileDiscoveryService {
  async discoverPdfFiles(sourceFolder: string): Promise<string[]> {
    const resolvedFolder = path.resolve(process.cwd(), sourceFolder || '');
    logger.logServiceMethodEntry('unknown', 'BatchFileDiscoveryService', 'discoverPdfFiles', {
      sourceFolder: resolvedFolder,
    });

    let stat: fs.Stats;
    try {
      stat = await fs.promises.stat(resolvedFolder);
    } catch (error) {
      throw new ValidationError(`Resume folder not found: ${resolvedFolder}`, error);
    }

    if (!stat.isDirectory()) {
      throw new ValidationError(`Batch upload source path is not a directory: ${resolvedFolder}`);
    }

    const filePaths = await this.walkDirectory(resolvedFolder);
    const pdfFiles = Array.from(new Set(filePaths))
      .filter((filePath) => path.extname(filePath).toLowerCase() === '.pdf')
      .sort();

    if (pdfFiles.length === 0) {
      throw new ValidationError(`No PDF resume files found in folder: ${resolvedFolder}`);
    }

    logger.logServiceMethodSuccess('unknown', 'BatchFileDiscoveryService', 'discoverPdfFiles', filePaths.length, {
      discoveredFiles: pdfFiles.length,
    });

    return pdfFiles;
  }

  private async walkDirectory(directory: string): Promise<string[]> {
    const entries = await fs.promises.readdir(directory, { withFileTypes: true });
    const results: string[] = [];

    for (const entry of entries) {
      const entryPath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        results.push(...(await this.walkDirectory(entryPath)));
      } else if (entry.isFile()) {
        results.push(entryPath);
      }
    }

    return results;
  }
}
