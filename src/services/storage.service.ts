import fs from 'fs';
import path from 'path';
import { Concert } from '../types';
import { config } from '../config';
import { log } from '../utils';

export class StorageService {
  constructor(private outputPath: string) {}

  loadExistingConcerts(): Concert[] {
    try {
      if (fs.existsSync(this.outputPath)) {
        const data = fs.readFileSync(this.outputPath, 'utf-8');
        return JSON.parse(data);
      }
    } catch (error) {
      log.error(`Error loading existing concerts: ${error}`);
    }
    return [];
  }

  saveConcerts(concerts: Concert[]): void {
    try {
      fs.writeFileSync(this.outputPath, JSON.stringify(concerts, null, 2));
      log.info(`Saved ${concerts.length} concerts to ${this.outputPath}`);
    } catch (error) {
      log.error(`Error saving concerts: ${error}`);
    }
  }

  logError(url: string, title: string, error: unknown): void {
    const errorLogPath = path.join(process.cwd(), 'errors.md');
    const timestamp = new Date().toISOString();
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : '';

    const errorEntry = `
## Error for ${title}
- **URL**: ${url}
- **Timestamp**: ${timestamp}
- **Error Message**: ${errorMessage}
${errorStack ? `- **Stack Trace**:\n\`\`\`\n${errorStack}\n\`\`\`\n` : ''}
---
`;

    try {
      fs.appendFileSync(errorLogPath, errorEntry);
      log.error(`Error logged for ${title} at ${errorLogPath}`);
    } catch (appendError) {
      log.error(`Failed to log error: ${appendError}`);
    }
  }
}
