import 'dotenv/config';
import { config } from './config';
import { delay, log } from './utils';
import { BrowserService } from './services/browser.service';
import { ScraperService } from './services/scraper.service';
import { StorageService } from './services/storage.service';

async function main() {
  const browserService = new BrowserService();
  const storageService = new StorageService(config.outputPath);

  try {
    const page = await browserService.initialize(config.headless);
    const scraperService = new ScraperService(page);

    // Load existing concerts
    const existingConcerts = storageService.loadExistingConcerts();
    const existingUrls = new Set(
      existingConcerts.map((concert) => concert.url)
    );
    log.info(`Loaded ${existingConcerts.length} existing concerts`);

    // Get all concert links
    const links = await scraperService.getAllConcertLinks();
    const newLinks = links.filter((link) => !existingUrls.has(link.url));

    log.info(`Found ${links.length} total concert links`);
    log.info(`Found ${newLinks.length} new concert links to process`);

    if (newLinks.length > 0) {
      log.info('New concerts to scrape:');
      newLinks.forEach((link) => log.info(`- ${link.url} (${link.title})`));

      const newConcerts = [];
      let processedCount = 0;
      const totalToProcess = newLinks.length;

      for (const link of newLinks) {
        try {
          const concerts = await scraperService.scrapeConcertDetails(link);
          newConcerts.push(...concerts);
          processedCount++;
          log.success(
            `Successfully scraped: ${link.title} (${
              concerts.length
            } events) - ${processedCount}/${totalToProcess} completed (${
              totalToProcess - processedCount
            } remaining)`
          );
          await delay(config.delayBetweenRequests);
        } catch (error) {
          storageService.logError(link.url, link.title, error);
          processedCount++;
          log.info(
            `Progress: ${processedCount}/${totalToProcess} (${
              totalToProcess - processedCount
            } remaining)`
          );
        }
      }

      // Combine existing and new concerts, sort by date
      const allConcerts = [...existingConcerts, ...newConcerts].sort((a, b) => {
        const dateA = new Date(a.dates[0].split(' ').reverse().join('-'));
        const dateB = new Date(b.dates[0].split(' ').reverse().join('-'));
        return dateA.getTime() - dateB.getTime();
      });

      // Save all concerts
      storageService.saveConcerts(allConcerts);
    } else {
      log.info('No new concerts found');
    }
  } catch (error) {
    log.error(`Main process error: ${error}`);
  } finally {
    await browserService.close();
  }
}

main().catch((error) => {
  log.error(`Unhandled error: ${error}`);
  process.exit(1);
});
