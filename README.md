# LiveNation Concert Scraper

A TypeScript web scraper that extracts concert information from [LiveNation's press releases](https://press.livenation.be/category/nieuw-concert) using Puppeteer and OpenAI's GPT-3.5.

## Features

- Scrapes concert information with intelligent data extraction via GPT-3.5
- Handles multiple dates, venues, and standardizes city names
- Incremental scraping (only processes new concerts)
- Pagination support with configurable settings

## Setup

### Prerequisites
- Node.js (v16+)
- OpenAI API key

### Installation
```bash
# Install dependencies
npm install

# Create .env file with your OpenAI API key
echo "OPENAI_API_KEY=your_api_key_here" > .env
```

### Configuration
Edit settings in `src/config/index.ts` to customize:
- Base URL, output path, request delays
- Browser mode (headless/visible)
- Pagination depth and OpenAI parameters

## Usage

```bash
# Run the scraper
npm start

# Development mode with auto-reload
npm run dev
```

## Output Format

```json
[
  {
    "title": "Concert Title",
    "dates": ["DD month YYYY"],
    "location": "Venue Name, City",
    "contact": {
      "name": "Contact Person",
      "email": "contact@email.com"
    },
    "url": "Concert URL"
  }
]
```

## How It Works

1. Loads existing concerts from `concerts.json` (if present)
2. Fetches and identifies new concert listings
3. Extracts structured data using GPT-3.5
4. Merges with existing data and sorts by date
5. Saves to `concerts.json`

## Error Handling

- Graceful handling of network errors and timeouts
- Detailed error logging to `errors.md`
- Preservation of existing data in case of failures

## License

ISC