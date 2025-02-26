import * as puppeteer from 'puppeteer';
import { Concert, ConcertLink, ExtractedInfo } from '../types';
import { config } from '../config';
import { delay, log } from '../utils';
import { extractInfoWithLLM } from '../utils/llm';

export class ScraperService {
  private page: puppeteer.Page;

  constructor(page: puppeteer.Page) {
    this.page = page;
  }

  async getAllConcertLinks(): Promise<ConcertLink[]> {
    await this.page.goto(config.baseUrl, {
      waitUntil: 'networkidle0',
    });

    await delay(2000);

    await this.loadAllConcerts();

    return this.extractConcertLinks();
  }

  private async loadAllConcerts(): Promise<void> {
    for (let i = 0; i < config.maxLoadMoreClicks; i++) {
      try {
        const buttonFound = await this.clickLoadMoreButton();
        if (!buttonFound) {
          log.info('No more concerts to load');
          break;
        }

        try {
          await this.page.waitForNetworkIdle({ timeout: 5000 });
        } catch (timeoutError) {
          log.info('Network idle timeout reached, continuing...');
        }

        log.info(`Loaded more concerts (${i + 1}/${config.maxLoadMoreClicks})`);
        await delay(2000);
      } catch (error) {
        log.error(`Failed to load more concerts: ${error}`);
        break;
      }
    }
  }

  private async clickLoadMoreButton(): Promise<boolean> {
    return this.page.evaluate(() => {
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
  }

  private async extractConcertLinks(): Promise<ConcertLink[]> {
    const links = await this.page.evaluate(() => {
      const cards = document.querySelectorAll('.StoryCard_container__KVQRO');
      return Array.from(cards)
        .map((card) => {
          const link = card.querySelector(
            'a.StoryCard_titleLink__El6wj'
          ) as HTMLAnchorElement | null;
          const title =
            card
              .querySelector('.StoryCard_title__c4NTz')
              ?.textContent?.trim() || '';
          return link?.href ? { url: link.href, title } : null;
        })
        .filter((link): link is ConcertLink => link !== null);
    });

    log.info(`Found ${links.length} concert links`);
    return links;
  }

  async scrapeConcertDetails(concertLink: ConcertLink): Promise<Concert[]> {
    await this.page.goto(concertLink.url, { waitUntil: 'networkidle0' });
    await delay(2000);

    const concertData = await this.extractPageContent();
    const extractedInfo = await extractInfoWithLLM(concertData.fullText);

    this.logExtractionResults(concertLink, extractedInfo);

    return this.createConcertObjects(concertLink, extractedInfo);
  }

  private async extractPageContent() {
    return this.page.evaluate(() => {
      const allElements = Array.from(document.querySelectorAll('body *'))
        .filter((el) => {
          const display = window.getComputedStyle(el).display;
          return display !== 'none' && el.textContent?.trim();
        })
        .map((el) => el.textContent?.trim())
        .filter(Boolean) as string[];

      const contactSection =
        document.querySelector('.contact-info, .press-contact, footer')
          ?.textContent || '';

      const fullText = `${allElements.join('\n')}\n${contactSection}`;
      return { fullText };
    });
  }

  private logExtractionResults(
    concertLink: ConcertLink,
    extractedInfo: ExtractedInfo
  ): void {
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
  }

  private createConcertObjects(
    concertLink: ConcertLink,
    extractedInfo: ExtractedInfo
  ): Concert[] {
    const eventsByLocation = extractedInfo.events.reduce<
      Record<string, string[]>
    >((acc: Record<string, string[]>, event) => {
      if (!acc[event.location]) {
        acc[event.location] = [];
      }
      acc[event.location].push(event.date);
      return acc;
    }, {});

    return Object.entries(eventsByLocation).map(([location, dates]) => ({
      title: concertLink.title,
      dates: this.sortDates(dates),
      location,
      ...(extractedInfo.contact && { contact: extractedInfo.contact }),
      url: concertLink.url,
    }));
  }

  private sortDates(dates: string[]): string[] {
    return dates.sort((a, b) => {
      const dateA = new Date(a.split(' ').reverse().join('-'));
      const dateB = new Date(b.split(' ').reverse().join('-'));
      return dateA.getTime() - dateB.getTime();
    });
  }
}
