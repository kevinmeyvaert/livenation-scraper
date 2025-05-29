import 'dotenv/config';
import { google } from 'googleapis';
import { log } from './utils';

async function checkServiceAccount() {
  try {
    let serviceAccountEmail = '';

    if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY_FILE) {
      log.info('Using service account key file...');
      const auth = new google.auth.GoogleAuth({
        keyFile: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_FILE,
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
      });

      const client = await auth.getClient();
      if (client && 'email' in client) {
        serviceAccountEmail = (client as any).email;
      }
    } else if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
      log.info('Using service account JSON...');
      const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
      serviceAccountEmail = credentials.client_email;
    } else {
      log.error('No service account configuration found!');
      log.info(
        'Please set either GOOGLE_SERVICE_ACCOUNT_KEY_FILE or GOOGLE_SERVICE_ACCOUNT_JSON'
      );
      return;
    }

    log.success('Service account configuration found!');
    log.info(`Service Account Email: ${serviceAccountEmail}`);
    log.info('');
    log.info('📋 TO FIX PERMISSION ERROR:');
    log.info('1. Open your Google Spreadsheet');
    log.info('2. Click the "Share" button (top right)');
    log.info(`3. Add this email: ${serviceAccountEmail}`);
    log.info('4. Set permission to "Editor"');
    log.info('5. Click "Send"');
    log.info('');
    log.info('Then try running: npm run push-to-sheets');
  } catch (error) {
    log.error(`Error checking service account: ${error}`);
  }
}

checkServiceAccount();
