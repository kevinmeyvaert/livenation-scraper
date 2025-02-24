import 'dotenv/config';
import * as puppeteer from 'puppeteer';
import fs from 'fs';
import { Concert } from './types';
import { config } from './config';
import { delay, log } from './utils';
import { extractInfoWithLLM } from './utils/llm';
import path from 'path';

interface ConcertLink {
  url: string;
  title: string;
}

function loadExistingConcerts(): Concert[] {
  try {
    if (fs.existsSync(config.outputPath)) {
      const data = fs.readFileSync(config.outputPath, 'utf-8');
      return JSON.parse(data);
    }
  } catch (error) {
    log.error(`Error loading existing concerts: ${error}`);
  }
  return [];
}

async function getAllConcertLinks(
  page: puppeteer.Page
): Promise<ConcertLink[]> {
  await page.goto(config.baseUrl, {
    waitUntil: 'networkidle0',
  });

  // Wait for the content to load
  await delay(2000);

  // Click the "Load More" button the configured number of times
  for (let i = 0; i < config.maxLoadMoreClicks; i++) {
    try {
      // Check if the button exists and click it using evaluate
      const buttonFound = await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const loadMoreButton = buttons.find((button) =>
          button.textContent?.trim().toLowerCase().includes('meer laden')
        );
        if (loadMoreButton) {
          loadMoreButton.click();
          return true;
        }
        return false;
      });

      if (!buttonFound) {
        log.info('No more concerts to load');
        break;
      }

      try {
        await page.waitForNetworkIdle({ timeout: 5000 });
      } catch (timeoutError) {
        log.info('Network idle timeout reached, continuing...');
      }

      log.info(`Loaded more concerts (${i + 1}/${config.maxLoadMoreClicks})`);
      await delay(2000); // Wait for content to load
    } catch (error) {
      log.error(`Failed to load more concerts: ${error}`);
      break;
    }
  }

  const links = await page.evaluate(() => {
    const cards = document.querySelectorAll('.StoryCard_container__KVQRO');
    return Array.from(cards)
      .map((card) => {
        const link = card.querySelector(
          'a.StoryCard_titleLink__El6wj'
        ) as HTMLAnchorElement | null;
        const title =
          card.querySelector('.StoryCard_title__c4NTz')?.textContent?.trim() ||
          '';
        return link?.href ? { url: link.href, title } : null;
      })
      .filter((link): link is ConcertLink => link !== null);
  });

  log.info(`Found ${links.length} concert links`);
  return links;
}

async function scrapeConcertDetails(
  page: puppeteer.Page,
  concertLink: ConcertLink
): Promise<Concert[]> {
  await page.goto(concertLink.url, { waitUntil: 'networkidle0' });
  await delay(2000);

  const concertData = await page.evaluate(() => {
    // Get all text content, including divs, spans, and other elements that might contain contact info
    const allElements = Array.from(document.querySelectorAll('body *'))
      .filter((el) => {
        const display = window.getComputedStyle(el).display;
        return display !== 'none' && el.textContent?.trim();
      })
      .map((el) => el.textContent?.trim())
      .filter(Boolean) as string[];

    // Get specific contact section if it exists
    const contactSection =
      document.querySelector('.contact-info, .press-contact, footer')
        ?.textContent || '';

    return {
      fullText: allElements.join('\n'),
      contactSection,
    };
  });

  // Combine all text for LLM processing
  const fullText = `${concertData.fullText}\n${concertData.contactSection}`;

  // Extract information using LLM
  const extractedInfo = await extractInfoWithLLM(fullText);

  log.info(`Scraped concert: ${concertLink.title}`);
  log.info(`Found ${extractedInfo.events.length} events:`);
  extractedInfo.events.forEach((event) => {
    log.info(`- ${event.date} at ${event.location}`);
  });
  if (extractedInfo.contact) {
    log.info(
      `Contact: ${extractedInfo.contact.name} (${extractedInfo.contact.email})`
    );
  } else {
    log.info('No press contact found');
  }

  // Group events by location
  const eventsByLocation = extractedInfo.events.reduce<
    Record<string, string[]>
  >((acc, event) => {
    if (!acc[event.location]) {
      acc[event.location] = [];
    }
    acc[event.location].push(event.date);
    return acc;
  }, {});

  // Create a Concert object for each unique location
  return Object.entries(eventsByLocation).map(([location, dates]) => ({
    title: concertLink.title,
    dates: dates.sort((a, b) => {
      const dateA = new Date(a.split(' ').reverse().join('-'));
      const dateB = new Date(b.split(' ').reverse().join('-'));
      return dateA.getTime() - dateB.getTime();
    }),
    location,
    ...(extractedInfo.contact && { contact: extractedInfo.contact }),
    url: concertLink.url,
  }));
}

function logError(url: string, title: string, error: unknown): void {
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

  fs.appendFileSync(errorLogPath, errorEntry);
}

async function main() {
  const browser = await puppeteer.launch({
    headless: config.headless,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });

    // Add console log handling
    page.on('console', (msg) => log.info(`Browser console: ${msg.text()}`));
    page.on('error', (err) => log.error(`Browser error: ${err}`));
    page.on('pageerror', (err) => log.error(`Page error: ${err}`));

    // Load existing concerts
    const existingConcerts = loadExistingConcerts();
    const existingUrls = new Set(
      existingConcerts.map((concert) => concert.url)
    );
    log.info(`Loaded ${existingConcerts.length} existing concerts`);

    const links = await getAllConcertLinks(page);
    const newLinks = links.filter((link) => !existingUrls.has(link.url));

    log.info(`Found ${links.length} total concert links`);
    log.info(`Found ${newLinks.length} new concert links to process`);

    if (newLinks.length > 0) {
      log.info('New concerts to scrape:');
      newLinks.forEach((link) => log.info(`- ${link.url} (${link.title})`));

      const newConcerts: Concert[] = [];
      let processedCount = 0;
      const totalToProcess = newLinks.length;

      for (const link of newLinks) {
        try {
          const concerts = await scrapeConcertDetails(page, link);
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
          logError(link.url, link.title, error);
          log.error(`Failed to scrape concert at ${link.url}: ${error}`);
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

      fs.writeFileSync(
        config.outputPath,
        JSON.stringify(allConcerts, null, 2),
        'utf-8'
      );
      log.success(
        `Saved ${newConcerts.length} new concerts to ${config.outputPath}`
      );
    } else {
      log.info('No new concerts to scrape');
    }
  } catch (error) {
    log.error(`An error occurred: ${error}`);
  } finally {
    await browser.close();
  }
}

main().catch((error) => log.error(`Fatal error: ${error}`));
