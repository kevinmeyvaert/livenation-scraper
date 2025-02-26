import * as puppeteer from 'puppeteer';
import { log } from '../utils';

export class BrowserService {
  private browser: puppeteer.Browser | null = null;
  private page: puppeteer.Page | null = null;

  async initialize(headless: boolean = true): Promise<puppeteer.Page> {
    try {
      this.browser = await puppeteer.launch({
        headless,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });

      this.page = await this.browser.newPage();
      await this.page.setViewport({ width: 1280, height: 800 });

      this.setupLogging(this.page);

      return this.page;
    } catch (error) {
      log.error(`Failed to initialize browser: ${error}`);
      throw error;
    }
  }

  private setupLogging(page: puppeteer.Page): void {
    page.on('console', (msg) => log.info(`Browser console: ${msg.text()}`));
    page.on('error', (err) => log.error(`Browser error: ${err}`));
    page.on('pageerror', (err) => log.error(`Page error: ${err}`));
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.page = null;
    }
  }

  getPage(): puppeteer.Page {
    if (!this.page) {
      throw new Error('Browser page not initialized. Call initialize() first.');
    }
    return this.page;
  }
}
