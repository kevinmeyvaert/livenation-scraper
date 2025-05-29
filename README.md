# LiveNation Concert Scraper

A TypeScript web scraper that extracts concert information from [LiveNation's press releases](https://press.livenation.be/category/nieuw-concert) using Puppeteer and OpenAI's GPT-3.5, with Google Sheets integration.

## Features

- Scrapes concert information with intelligent data extraction via GPT-3.5
- Handles multiple dates, venues, and standardizes city names
- Incremental scraping (only processes new concerts)
- Pagination support with configurable settings
- **Google Sheets integration** for easy data sharing and visualization

## Setup

### Prerequisites

- Node.js (v16+)
- OpenAI API key
- Google API key (for Google Sheets integration)

### Installation

```bash
# Install dependencies
npm install

# Create .env file with your API keys
echo "OPENAI_API_KEY=your_openai_api_key_here" > .env
echo "GOOGLE_SPREADSHEET_ID=your_google_spreadsheet_id" >> .env

# For service account authentication (recommended):
echo "GOOGLE_SERVICE_ACCOUNT_KEY_FILE=path/to/service-account-key.json" >> .env
# OR
echo "GOOGLE_SERVICE_ACCOUNT_JSON='your_service_account_json_content'" >> .env

# For API key authentication (limited functionality):
# echo "GOOGLE_API_KEY=your_google_api_key_here" >> .env
```

### Google Sheets Setup

**Option 1: Service Account (Recommended)**

1. **Create a Google Cloud Project**:

   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select an existing one

2. **Enable Google Sheets API**:

   - Navigate to "APIs & Services" > "Library"
   - Search for "Google Sheets API" and enable it

3. **Create Service Account**:

   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "Service Account"
   - Fill in the service account details
   - Click "Create and Continue"
   - Skip the optional steps and click "Done"
   - Click on the created service account
   - Go to "Keys" tab > "Add Key" > "Create new key" > "JSON"
   - Download the JSON key file

4. **Configure Authentication** (choose one):

   ```bash
   # Option A: Use JSON file path
   echo "GOOGLE_SERVICE_ACCOUNT_KEY_FILE=path/to/service-account-key.json" >> .env

   # Option B: Use JSON content directly (more secure for deployment)
   echo "GOOGLE_SERVICE_ACCOUNT_JSON='$(cat path/to/service-account-key.json)'" >> .env
   ```

5. **Create and Configure Google Spreadsheet**:
   - Create a new Google Spreadsheet
   - Copy the spreadsheet ID from the URL (the long string between `/d/` and `/edit`)
   - Add this ID to your `.env` as `GOOGLE_SPREADSHEET_ID=your_spreadsheet_id`
   - Share the spreadsheet with your service account email (found in the JSON key file)
     - Click "Share" button in the top right
     - Add the service account email (looks like: `your-service@project-id.iam.gserviceaccount.com`)
     - Set permission to "Editor"

**Option 2: API Key (Limited Functionality)**

If you prefer to use an API key (not recommended due to limitations):

1. **Create API Key**:

   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "API Key"
   - Copy the API key and add it to your `.env` as `GOOGLE_API_KEY=your_api_key_here`

2. **Configure Spreadsheet**:
   - Create a new Google Spreadsheet
   - Share it with "Anyone with the link can edit" permissions
   - Note: This method has limited functionality and may not work reliably

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

# Push existing concerts.json data to Google Sheets
npm run push-to-sheets
```

## Google Sheets Integration

The Google Sheets integration provides:

- **Automatic formatting**: Headers with dark background and frozen first row
- **Structured data**: Organized columns for Title, Dates, Location, Contact info, URL, and Last Updated
- **Easy sharing**: Share the spreadsheet with team members for collaborative access
- **Data visualization**: Use Google Sheets' built-in charts and pivot tables
- **Dedicated tab**: Data is pushed to a "Livenation Shows" sheet tab for organization

### Columns in Google Sheets:

- **Title**: Concert/artist name
- **Dates**: All concert dates (comma-separated)
- **Location**: Venue and city
- **Contact Name**: Press contact person
- **Contact Email**: Press contact email
- **URL**: Link to original press release
- **Last Updated**: Timestamp of when data was pushed

The data will be automatically organized in a sheet tab called "Livenation Shows".

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
6. Optionally pushes data to Google Sheets for easy sharing

## Error Handling

- Graceful handling of network errors and timeouts
- Detailed error logging to `errors.md`
- Preservation of existing data in case of failures

## License

ISC
