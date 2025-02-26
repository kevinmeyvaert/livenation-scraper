import { ScraperConfig } from '../types';

export const config: ScraperConfig = {
  baseUrl: 'https://press.livenation.be/category/nieuw-concert',
  outputPath: './concerts.json',
  delayBetweenRequests: 1000, // 1 second delay between requests
  headless: true,
  maxLoadMoreClicks: 3, // Will load 3 additional pages of concerts
  openai: {
    apiKey: process.env.OPENAI_API_KEY || '',
    model: 'gpt-3.5-turbo',
    temperature: 0,
    maxTokens: 1000,
  },
};
