# LiveNation Concert Scraper

A TypeScript-based web scraper that extracts concert information from [LiveNation's press releases](https://press.livenation.be/category/nieuw-concert) using Puppeteer and OpenAI's GPT-3.5 for intelligent data extraction.

## Features

- Scrapes concert information from LiveNation's press page
- Uses GPT-3.5 to intelligently extract structured data:
  - Concert dates in standardized format
  - Venue and city information
  - Press contact details
- Handles multiple dates and venues per concert
- Standardizes city names (Brussel/Antwerpen)
- Built with TypeScript and Puppeteer
- Includes rate limiting to prevent overloading the server
- Incremental scraping:
  - Only processes new concerts not already in the database
  - Preserves existing concert data
  - Automatically merges and sorts concerts by date
- Pagination support:
  - Automatically clicks "Load More" button to fetch additional concerts
  - Configurable number of pages to load
  - Graceful handling of network timeouts

## Prerequisites

- Node.js (v16 or higher)
- OpenAI API key
- TypeScript

## Installation

1. Clone the repository
2. Install dependencies:
```bash
npm install
```
3. Create a `.env` file in the root directory with your OpenAI API key:
```bash
OPENAI_API_KEY=your_api_key_here
```

## Configuration

You can modify the scraper settings in `src/config/index.ts`:

- `baseUrl`: The URL to scrape
- `outputPath`: Where to save the JSON file
- `delayBetweenRequests`: Delay between requests (in ms)
- `headless`: Whether to run the browser in headless mode
- `maxLoadMoreClicks`: Number of times to click the "Load More" button (default: 3)
- `openai`: OpenAI configuration (model, temperature, etc.)

## Usage

To run the scraper:

```bash
npm start
```

For development with auto-reloading:

```bash
npm run dev
```

The scraper will:
1. Load existing concerts from `concerts.json` if present
2. Fetch the concert list from LiveNation's press page
3. Click the "Load More" button to fetch additional concerts
4. Compare against existing concerts to identify new ones
5. Only process and extract information for new concerts
6. Merge new concerts with existing ones and sort by date
7. Save the updated list back to `concerts.json`

## Output Format

The scraper outputs a JSON file with the following structure:

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

## Data Extraction

The scraper uses OpenAI's GPT-3.5 model to extract information from concert pages. It follows these rules:

1. Dates are formatted as "DD month YYYY" (e.g., "24 juni 2025")
2. Locations include venue name and city (e.g., "Vorst Nationaal, Brussel")
3. Multiple entries are made if shows are in multiple venues
4. City names are standardized to "Brussel" and "Antwerpen"
5. Contact information is extracted from press contact sections

## Incremental Updates

The scraper maintains a database of concerts in `concerts.json` and implements smart updating:

- Only processes concerts that aren't already in the database
- Preserves all existing concert information
- Automatically sorts concerts by date when merging
- Handles multiple dates per concert when sorting
- Provides detailed logging of new vs. existing concerts

To re-scrape a specific concert:
1. Remove its entry from `concerts.json`
2. Run the scraper again

## Error Handling

- Graceful handling of network errors
- Fallback to default contact when none is found
- Logging of all errors and warnings
- Retry mechanism for failed requests
- Smart timeout handling for "Load More" functionality
- Preservation of existing data in case of errors

## Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

## License

ISC