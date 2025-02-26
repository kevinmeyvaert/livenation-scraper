export interface Contact {
  name: string;
  email: string;
}

export interface Concert {
  title: string;
  dates: string[];
  location: string;
  contact?: Contact;
  url: string;
}

export interface ConcertLink {
  url: string;
  title: string;
}

export interface ExtractedInfo {
  events: Array<{
    date: string;
    location: string;
  }>;
  contact?: Contact;
}

export interface OpenAIConfig {
  apiKey: string;
  model: string;
  temperature: number;
  maxTokens: number;
}

export interface ScraperConfig {
  baseUrl: string;
  outputPath: string;
  delayBetweenRequests: number;
  headless: boolean;
  maxLoadMoreClicks: number;
  openai: OpenAIConfig;
}
