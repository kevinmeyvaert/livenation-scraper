import 'dotenv/config';
import { GoogleSheetsService } from './services/google-sheets.service';
import { StorageService } from './services/storage.service';
import { config } from './config';
import { log } from './utils';

async function main() {
  try {
    // Check required environment variables
    if (!process.env.GOOGLE_SPREADSHEET_ID) {
      throw new Error('GOOGLE_SPREADSHEET_ID environment variable is required');
    }

    // Check for at least one authentication method
    if (
      !process.env.GOOGLE_SERVICE_ACCOUNT_KEY_FILE &&
      !process.env.GOOGLE_SERVICE_ACCOUNT_JSON &&
      !process.env.GOOGLE_API_KEY
    ) {
      throw new Error(
        'At least one Google authentication method is required: GOOGLE_SERVICE_ACCOUNT_KEY_FILE, GOOGLE_SERVICE_ACCOUNT_JSON, or GOOGLE_API_KEY'
      );
    }

    log.info('Starting Google Sheets append process...');

    // Load existing concerts
    const storageService = new StorageService(config.outputPath);
    const concerts = storageService.loadExistingConcerts();

    if (concerts.length === 0) {
      log.info('No concerts found in concerts.json');
      return;
    }

    log.info(`Found ${concerts.length} concerts to append to Google Sheets`);

    // Initialize Google Sheets service
    const sheetsService = new GoogleSheetsService(
      process.env.GOOGLE_SPREADSHEET_ID
    );
    await sheetsService.initialize();

    // Create sheet if it doesn't exist
    await sheetsService.createSheet('Livenation Shows');

    // Append concerts to Google Sheets (safer for existing content)
    await sheetsService.appendConcerts(concerts, 'Livenation Shows');

    log.success('Successfully completed Google Sheets append process!');
    log.info(
      `View your data at: https://docs.google.com/spreadsheets/d/${process.env.GOOGLE_SPREADSHEET_ID}`
    );
  } catch (error) {
    log.error(`Google Sheets append failed: ${error}`);
    process.exit(1);
  }
}

main().catch((error) => {
  log.error(`Unhandled error: ${error}`);
  process.exit(1);
});
