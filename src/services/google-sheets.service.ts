import { google } from 'googleapis';
import { Concert } from '../types';
import { log } from '../utils';

export class GoogleSheetsService {
  private sheets: any;
  private spreadsheetId: string;

  constructor(spreadsheetId: string) {
    this.spreadsheetId = spreadsheetId;
  }

  async initialize(): Promise<void> {
    try {
      let auth;

      // Try service account first (recommended)
      if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY_FILE) {
        auth = new google.auth.GoogleAuth({
          keyFile: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_FILE,
          scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });
        log.info('Google Sheets API initialized with service account');

        // Get and display service account email for sharing instructions
        const client = await auth.getClient();
        if (client && 'email' in client) {
          log.info(`Service account email: ${(client as any).email}`);
          log.info(
            'Make sure to share your Google Spreadsheet with this email address!'
          );
        }
      }
      // Try service account JSON string
      else if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
        const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
        auth = new google.auth.GoogleAuth({
          credentials,
          scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });
        log.info('Google Sheets API initialized with service account JSON');
        log.info(`Service account email: ${credentials.client_email}`);
        log.info(
          'Make sure to share your Google Spreadsheet with this email address!'
        );
      }
      // Fallback to API key (limited functionality)
      else if (process.env.GOOGLE_API_KEY) {
        auth = process.env.GOOGLE_API_KEY;
        log.info(
          'Google Sheets API initialized with API key (limited functionality)'
        );
        log.warning(
          'API key has limited permissions. Consider using a service account for full functionality.'
        );
      } else {
        throw new Error(
          'No Google authentication method found. Please set GOOGLE_SERVICE_ACCOUNT_KEY_FILE, GOOGLE_SERVICE_ACCOUNT_JSON, or GOOGLE_API_KEY'
        );
      }

      this.sheets = google.sheets({ version: 'v4', auth });
    } catch (error) {
      log.error(`Failed to initialize Google Sheets API: ${error}`);
      throw error;
    }
  }

  async clearSheet(sheetName: string = 'Livenation Shows'): Promise<void> {
    try {
      // First check if the sheet exists
      const spreadsheet = await this.sheets.spreadsheets.get({
        spreadsheetId: this.spreadsheetId,
      });

      const sheet = spreadsheet.data.sheets?.find(
        (s: any) => s.properties.title === sheetName
      );

      if (!sheet) {
        log.info(
          `Sheet "${sheetName}" doesn't exist, skipping clear operation`
        );
        return;
      }

      // Clear the sheet content
      await this.sheets.spreadsheets.values.clear({
        spreadsheetId: this.spreadsheetId,
        range: `${sheetName}!A:Z`,
      });
      log.info(`Cleared sheet: ${sheetName}`);
    } catch (error: unknown) {
      if (error instanceof Error) {
        if (error.message?.includes('Unable to parse range')) {
          log.warning(
            `Sheet "${sheetName}" might be empty or have formatting issues, continuing...`
          );
        } else {
          log.error(`Failed to clear sheet: ${error.message}`);
          throw error;
        }
      } else {
        log.error(`Failed to clear sheet: ${error}`);
        throw error;
      }
    }
  }

  async pushConcerts(
    concerts: Concert[],
    sheetName: string = 'Livenation Shows'
  ): Promise<void> {
    try {
      // Prepare headers
      const headers = [
        'Title',
        'Dates',
        'Location',
        'Contact Name',
        'Contact Email',
        'URL',
        'Last Updated',
      ];

      // Prepare data rows
      const rows = concerts.map((concert) => [
        concert.title,
        concert.dates.join(', '),
        concert.location,
        concert.contact?.name || '',
        concert.contact?.email || '',
        concert.url,
        new Date().toISOString(),
      ]);

      // Combine headers and data
      const values = [headers, ...rows];

      // Try to clear the sheet first (but don't fail if it doesn't work)
      try {
        await this.clearSheet(sheetName);
      } catch (clearError) {
        log.warning(
          `Could not clear sheet, will overwrite existing data: ${clearError}`
        );
      }

      // Write data to sheet
      const response = await this.sheets.spreadsheets.values.update({
        spreadsheetId: this.spreadsheetId,
        range: `${sheetName}!A1`,
        valueInputOption: 'RAW',
        requestBody: {
          values: values,
        },
      });

      log.success(
        `Successfully pushed ${concerts.length} concerts to Google Sheets`
      );
      log.info(`Updated range: ${response.data.updatedRange}`);
      log.info(
        `Updated ${response.data.updatedRows} rows and ${response.data.updatedColumns} columns`
      );
    } catch (error: unknown) {
      if (error instanceof Error) {
        log.error(`Failed to push concerts to Google Sheets: ${error.message}`);
      } else {
        log.error(`Failed to push concerts to Google Sheets: ${error}`);
      }
      throw error;
    }
  }

  async createSheet(sheetName: string): Promise<void> {
    try {
      // First, check if the sheet already exists
      const spreadsheet = await this.sheets.spreadsheets.get({
        spreadsheetId: this.spreadsheetId,
      });

      const existingSheet = spreadsheet.data.sheets?.find(
        (s: any) => s.properties.title === sheetName
      );

      if (existingSheet) {
        log.info(`Sheet "${sheetName}" already exists, skipping creation`);
        return;
      }

      // Create the sheet only if it doesn't exist
      await this.sheets.spreadsheets.batchUpdate({
        spreadsheetId: this.spreadsheetId,
        requestBody: {
          requests: [
            {
              addSheet: {
                properties: {
                  title: sheetName,
                },
              },
            },
          ],
        },
      });
      log.info(`Created new sheet: ${sheetName}`);
    } catch (error: unknown) {
      if (error instanceof Error) {
        if (error.message?.includes('already exists')) {
          log.info(`Sheet ${sheetName} already exists, continuing...`);
        } else if (error.message?.includes('Internal error')) {
          log.warning(
            `Internal error when creating sheet. Sheet "${sheetName}" may already exist, continuing...`
          );
        } else {
          log.error(`Failed to create sheet: ${error.message}`);
          throw error;
        }
      } else {
        log.error(`Failed to create sheet: ${error}`);
        throw error;
      }
    }
  }

  async formatSheet(sheetName: string = 'Livenation Shows'): Promise<void> {
    try {
      // Get sheet ID
      const spreadsheet = await this.sheets.spreadsheets.get({
        spreadsheetId: this.spreadsheetId,
      });

      const sheet = spreadsheet.data.sheets?.find(
        (s: any) => s.properties.title === sheetName
      );

      if (!sheet) {
        throw new Error(`Sheet ${sheetName} not found`);
      }

      const sheetId = sheet.properties.sheetId;

      // Format the header row
      await this.sheets.spreadsheets.batchUpdate({
        spreadsheetId: this.spreadsheetId,
        requestBody: {
          requests: [
            {
              repeatCell: {
                range: {
                  sheetId: sheetId,
                  startRowIndex: 0,
                  endRowIndex: 1,
                },
                cell: {
                  userEnteredFormat: {
                    backgroundColor: {
                      red: 0.2,
                      green: 0.2,
                      blue: 0.2,
                    },
                    textFormat: {
                      foregroundColor: {
                        red: 1.0,
                        green: 1.0,
                        blue: 1.0,
                      },
                      bold: true,
                    },
                  },
                },
                fields: 'userEnteredFormat(backgroundColor,textFormat)',
              },
            },
            {
              updateSheetProperties: {
                properties: {
                  sheetId: sheetId,
                  gridProperties: {
                    frozenRowCount: 1,
                  },
                },
                fields: 'gridProperties.frozenRowCount',
              },
            },
            {
              autoResizeDimensions: {
                dimensions: {
                  sheetId: sheetId,
                  dimension: 'COLUMNS',
                  startIndex: 0,
                  endIndex: 7,
                },
              },
            },
          ],
        },
      });

      log.info(`Formatted sheet: ${sheetName}`);
    } catch (error) {
      log.error(`Failed to format sheet: ${error}`);
      // Don't throw here as formatting is optional
    }
  }

  async appendConcerts(
    concerts: Concert[],
    sheetName: string = 'Livenation Shows'
  ): Promise<void> {
    try {
      // Get existing data to check for duplicates
      let existingUrls = new Set<string>();
      let needsHeaders = false;

      try {
        const existingData = await this.sheets.spreadsheets.values.get({
          spreadsheetId: this.spreadsheetId,
          range: `${sheetName}!A:G`,
        });

        if (
          !existingData.data.values ||
          existingData.data.values.length === 0
        ) {
          needsHeaders = true;
        } else {
          // Extract URLs from existing data (URL is in column F, index 5)
          const rows = existingData.data.values;
          if (rows.length > 1) {
            // Skip header row
            for (let i = 1; i < rows.length; i++) {
              const row = rows[i];
              if (row && row[5]) {
                // URL column
                existingUrls.add(row[5]);
              }
            }
          }
          log.info(`Found ${existingUrls.size} existing concerts in the sheet`);
        }
      } catch (error) {
        // Sheet might not exist or be empty
        needsHeaders = true;
        log.info("Sheet appears to be empty or doesn't exist");
      }

      // Filter out concerts that already exist
      const newConcerts = concerts.filter(
        (concert) => !existingUrls.has(concert.url)
      );

      if (newConcerts.length === 0) {
        log.info(
          'No new concerts to add - all concerts already exist in the sheet'
        );
        return;
      }

      log.info(
        `Found ${newConcerts.length} new concerts to append (${
          concerts.length - newConcerts.length
        } duplicates skipped)`
      );

      // Prepare headers if needed
      const headers = [
        'Title',
        'Dates',
        'Location',
        'Contact Name',
        'Contact Email',
        'URL',
        'Last Updated',
      ];

      // Prepare data rows for new concerts only
      const rows = newConcerts.map((concert) => [
        concert.title,
        concert.dates.join(', '),
        concert.location,
        concert.contact?.name || '',
        concert.contact?.email || '',
        concert.url,
        new Date().toISOString(),
      ]);

      // Combine headers and data if needed
      const values = needsHeaders ? [headers, ...rows] : rows;

      // Append data to sheet
      const response = await this.sheets.spreadsheets.values.append({
        spreadsheetId: this.spreadsheetId,
        range: `${sheetName}!A:G`,
        valueInputOption: 'RAW',
        insertDataOption: 'INSERT_ROWS',
        requestBody: {
          values: values,
        },
      });

      log.success(
        `Successfully appended ${newConcerts.length} new concerts to Google Sheets`
      );
      log.info(`Updated range: ${response.data.updates?.updatedRange}`);
      log.info(
        `Added ${response.data.updates?.updatedRows} rows and ${response.data.updates?.updatedColumns} columns`
      );
    } catch (error: unknown) {
      if (error instanceof Error) {
        log.error(
          `Failed to append concerts to Google Sheets: ${error.message}`
        );
      } else {
        log.error(`Failed to append concerts to Google Sheets: ${error}`);
      }
      throw error;
    }
  }

  async syncConcerts(
    concerts: Concert[],
    sheetName: string = 'Livenation Shows'
  ): Promise<void> {
    try {
      // Get existing data to check for duplicates and updates
      let existingConcerts = new Map<string, { row: number; data: any[] }>();
      let needsHeaders = false;

      try {
        const existingData = await this.sheets.spreadsheets.values.get({
          spreadsheetId: this.spreadsheetId,
          range: `${sheetName}!A:G`,
        });

        if (
          !existingData.data.values ||
          existingData.data.values.length === 0
        ) {
          needsHeaders = true;
        } else {
          // Map existing concerts by URL
          const rows = existingData.data.values;
          if (rows.length > 1) {
            // Skip header row
            for (let i = 1; i < rows.length; i++) {
              const row = rows[i];
              if (row && row[5]) {
                // URL column
                existingConcerts.set(row[5], { row: i + 1, data: row });
              }
            }
          }
          log.info(
            `Found ${existingConcerts.size} existing concerts in the sheet`
          );
        }
      } catch (error) {
        needsHeaders = true;
        log.info("Sheet appears to be empty or doesn't exist");
      }

      // Prepare headers if needed
      const headers = [
        'Title',
        'Dates',
        'Location',
        'Contact Name',
        'Contact Email',
        'URL',
        'Last Updated',
      ];

      // Separate new concerts and updates
      const newConcerts: Concert[] = [];
      const updatedConcerts: { concert: Concert; row: number }[] = [];

      for (const concert of concerts) {
        const existing = existingConcerts.get(concert.url);
        if (!existing) {
          // New concert
          newConcerts.push(concert);
        } else {
          // Check if concert data has changed
          const newData = [
            concert.title,
            concert.dates.join(', '),
            concert.location,
            concert.contact?.name || '',
            concert.contact?.email || '',
            concert.url,
          ];

          const existingData = existing.data.slice(0, 6); // Exclude timestamp
          const hasChanged =
            JSON.stringify(newData) !== JSON.stringify(existingData);

          if (hasChanged) {
            updatedConcerts.push({ concert, row: existing.row });
          }
        }
      }

      log.info(
        `Found ${newConcerts.length} new concerts and ${updatedConcerts.length} concerts to update`
      );

      // Add headers if needed
      if (
        needsHeaders &&
        (newConcerts.length > 0 || updatedConcerts.length > 0)
      ) {
        await this.sheets.spreadsheets.values.append({
          spreadsheetId: this.spreadsheetId,
          range: `${sheetName}!A:G`,
          valueInputOption: 'RAW',
          insertDataOption: 'INSERT_ROWS',
          requestBody: {
            values: [headers],
          },
        });
      }

      // Add new concerts
      if (newConcerts.length > 0) {
        const newRows = newConcerts.map((concert) => [
          concert.title,
          concert.dates.join(', '),
          concert.location,
          concert.contact?.name || '',
          concert.contact?.email || '',
          concert.url,
          new Date().toISOString(),
        ]);

        await this.sheets.spreadsheets.values.append({
          spreadsheetId: this.spreadsheetId,
          range: `${sheetName}!A:G`,
          valueInputOption: 'RAW',
          insertDataOption: 'INSERT_ROWS',
          requestBody: {
            values: newRows,
          },
        });

        log.success(`Added ${newConcerts.length} new concerts`);
      }

      // Update existing concerts
      if (updatedConcerts.length > 0) {
        for (const { concert, row } of updatedConcerts) {
          const updatedRow = [
            concert.title,
            concert.dates.join(', '),
            concert.location,
            concert.contact?.name || '',
            concert.contact?.email || '',
            concert.url,
            new Date().toISOString(),
          ];

          await this.sheets.spreadsheets.values.update({
            spreadsheetId: this.spreadsheetId,
            range: `${sheetName}!A${row}:G${row}`,
            valueInputOption: 'RAW',
            requestBody: {
              values: [updatedRow],
            },
          });
        }

        log.success(`Updated ${updatedConcerts.length} existing concerts`);
      }

      if (newConcerts.length === 0 && updatedConcerts.length === 0) {
        log.info('No changes needed - all concerts are up to date');
      }
    } catch (error: unknown) {
      if (error instanceof Error) {
        log.error(`Failed to sync concerts to Google Sheets: ${error.message}`);
      } else {
        log.error(`Failed to sync concerts to Google Sheets: ${error}`);
      }
      throw error;
    }
  }
}
