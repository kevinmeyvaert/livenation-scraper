const express = require('express');
const { spawn } = require('child_process');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Graceful shutdown handling
process.on('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('Received SIGINT, shutting down gracefully');
  process.exit(0);
});

// Health check endpoint
app.get('/', (req, res) => {
  res.json({ 
    status: 'Simple webhook server is running', 
    timestamp: new Date().toISOString(),
    port: PORT,
    env: {
      hasOpenAI: !!process.env.OPENAI_API_KEY,
      hasGoogleSpreadsheet: !!process.env.GOOGLE_SPREADSHEET_ID,
      hasGoogleAuth: !!(process.env.GOOGLE_SERVICE_ACCOUNT_JSON || process.env.GOOGLE_SERVICE_ACCOUNT_KEY_FILE || process.env.GOOGLE_API_KEY)
    }
  });
});

// Check environment variables
function checkEnvironment() {
  const missing = [];
  
  if (!process.env.OPENAI_API_KEY) {
    missing.push('OPENAI_API_KEY');
  }
  
  if (!process.env.GOOGLE_SPREADSHEET_ID) {
    missing.push('GOOGLE_SPREADSHEET_ID');
  }
  
  if (!process.env.GOOGLE_SERVICE_ACCOUNT_JSON && 
      !process.env.GOOGLE_SERVICE_ACCOUNT_KEY_FILE && 
      !process.env.GOOGLE_API_KEY) {
    missing.push('Google authentication');
  }
  
  return missing;
}

// Function to run scraper directly with node
function runScraperDirect() {
  return new Promise((resolve, reject) => {
    console.log('Starting scraper process directly...');
    
    // Run the compiled JavaScript directly
    const scraperProcess = spawn('node', ['dist/index.js'], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: process.env,
      timeout: 300000 // 5 minutes
    });
    
    let stdout = '';
    let stderr = '';
    
    scraperProcess.stdout.on('data', (data) => {
      const output = data.toString();
      console.log('Scraper stdout:', output);
      stdout += output;
    });
    
    scraperProcess.stderr.on('data', (data) => {
      const output = data.toString();
      console.error('Scraper stderr:', output);
      stderr += output;
    });
    
    scraperProcess.on('close', (code, signal) => {
      console.log(`Scraper process closed with code ${code} and signal ${signal}`);
      
      if (code === 0) {
        console.log('Scraper completed successfully');
        
        // Now run the Google Sheets append
        runSheetsAppend()
          .then(() => resolve({ success: true, stdout, stderr }))
          .catch((sheetsError) => {
            console.error('Sheets append failed:', sheetsError);
            resolve({ success: true, stdout, stderr, sheetsError });
          });
      } else {
        console.error(`Scraper failed with exit code ${code}`);
        reject({ success: false, code, signal, stdout, stderr });
      }
    });
    
    scraperProcess.on('error', (error) => {
      console.error('Scraper process error:', error);
      reject({ success: false, error: error.message, stdout, stderr });
    });
    
    console.log('Scraper process started with PID:', scraperProcess.pid);
  });
}

// Function to run Google Sheets append
function runSheetsAppend() {
  return new Promise((resolve, reject) => {
    console.log('Starting Google Sheets append...');
    
    const sheetsProcess = spawn('node', ['-r', 'ts-node/register', 'src/append-to-sheets.ts'], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: process.env,
      timeout: 60000 // 1 minute
    });
    
    let stdout = '';
    let stderr = '';
    
    sheetsProcess.stdout.on('data', (data) => {
      const output = data.toString();
      console.log('Sheets stdout:', output);
      stdout += output;
    });
    
    sheetsProcess.stderr.on('data', (data) => {
      const output = data.toString();
      console.error('Sheets stderr:', output);
      stderr += output;
    });
    
    sheetsProcess.on('close', (code, signal) => {
      console.log(`Sheets process closed with code ${code} and signal ${signal}`);
      
      if (code === 0) {
        console.log('Google Sheets append completed successfully');
        resolve({ success: true, stdout, stderr });
      } else {
        console.error(`Sheets append failed with exit code ${code}`);
        reject({ success: false, code, signal, stdout, stderr });
      }
    });
    
    sheetsProcess.on('error', (error) => {
      console.error('Sheets process error:', error);
      reject({ success: false, error: error.message, stdout, stderr });
    });
  });
}

// Webhook endpoint to trigger scraper
app.post('/webhook/scrape', async (req, res) => {
  console.log('Webhook received:', new Date().toISOString());
  console.log('Request body:', req.body);
  
  // Check environment variables
  const missingEnvVars = checkEnvironment();
  if (missingEnvVars.length > 0) {
    const errorMsg = `Missing required environment variables: ${missingEnvVars.join(', ')}`;
    console.error(errorMsg);
    return res.status(500).json({
      status: 'error',
      message: errorMsg,
      timestamp: new Date().toISOString()
    });
  }
  
  // Send immediate response
  res.json({ 
    status: 'Scraper started', 
    timestamp: new Date().toISOString(),
    message: 'Scraping process initiated in background (direct mode)'
  });
  
  // Run scraper in background
  runScraperDirect().catch((error) => {
    console.error('Scraper failed:', error);
  });
});

// Manual trigger endpoint
app.get('/webhook/scrape', async (req, res) => {
  console.log('Manual scrape triggered:', new Date().toISOString());
  
  const missingEnvVars = checkEnvironment();
  if (missingEnvVars.length > 0) {
    const errorMsg = `Missing required environment variables: ${missingEnvVars.join(', ')}`;
    console.error(errorMsg);
    return res.status(500).json({
      status: 'error',
      message: errorMsg,
      timestamp: new Date().toISOString()
    });
  }
  
  res.json({ 
    status: 'Scraper started', 
    timestamp: new Date().toISOString(),
    message: 'Scraping process initiated in background (direct mode)'
  });
  
  runScraperDirect().catch((error) => {
    console.error('Scraper failed:', error);
  });
});

// Simple test endpoint
app.get('/test/simple', (req, res) => {
  res.json({
    status: 'Simple test successful',
    timestamp: new Date().toISOString(),
    message: 'Server is responding correctly'
  });
});

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`Simple webhook server running on port ${PORT}`);
  console.log(`Webhook URL: http://localhost:${PORT}/webhook/scrape`);
  console.log(`Health check: http://localhost:${PORT}/`);
  console.log(`Simple test: http://localhost:${PORT}/test/simple`);
  
  // Check environment on startup
  const missingEnvVars = checkEnvironment();
  if (missingEnvVars.length > 0) {
    console.warn('⚠️  Missing environment variables:', missingEnvVars.join(', '));
    console.warn('⚠️  Scraper will fail until these are set!');
  } else {
    console.log('✅ All required environment variables are set');
  }
});

// Handle server errors
server.on('error', (error) => {
  console.error('Server error:', error);
}); 