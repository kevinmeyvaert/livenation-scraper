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
