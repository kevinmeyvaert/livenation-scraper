const express = require('express');
const { spawn } = require('child_process');
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
    status: 'Scraper webhook server is running', 
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
    missing.push('Google authentication (GOOGLE_SERVICE_ACCOUNT_JSON, GOOGLE_SERVICE_ACCOUNT_KEY_FILE, or GOOGLE_API_KEY)');
  }
  
  return missing;
}

// Function to run scraper with better process management
function runScraper() {
  return new Promise((resolve, reject) => {
    console.log('Starting scraper process...');
    
    // Use spawn instead of exec for better process control
    const scraperProcess = spawn('npm', ['run', 'start'], {
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
        resolve({ success: true, stdout, stderr });
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
    message: 'Scraping process initiated in background'
  });
  
  // Run scraper in background
  runScraper().catch((error) => {
    console.error('Scraper failed:', error);
  });
});

// Optional: Endpoint to trigger scraper manually via GET
app.get('/webhook/scrape', async (req, res) => {
  console.log('Manual scrape triggered:', new Date().toISOString());
  
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
  
  res.json({ 
    status: 'Scraper started', 
    timestamp: new Date().toISOString(),
    message: 'Scraping process initiated in background'
  });
  
  runScraper().catch((error) => {
    console.error('Scraper failed:', error);
  });
});

// Test endpoint to check just the build
app.get('/test/build', (req, res) => {
  console.log('Testing build process:', new Date().toISOString());
  
  res.json({ 
    status: 'Build test started', 
    timestamp: new Date().toISOString(),
    message: 'Testing TypeScript build process'
  });
  
  const buildProcess = spawn('npm', ['run', 'build'], {
    stdio: ['pipe', 'pipe', 'pipe'],
    env: process.env
  });
  
  buildProcess.stdout.on('data', (data) => {
    console.log('Build stdout:', data.toString());
  });
  
  buildProcess.stderr.on('data', (data) => {
    console.error('Build stderr:', data.toString());
  });
  
  buildProcess.on('close', (code) => {
    if (code === 0) {
      console.log('Build completed successfully');
    } else {
      console.error('Build failed with exit code:', code);
    }
  });
});

// Simple test endpoint that doesn't run any subprocesses
app.get('/test/simple', (req, res) => {
  res.json({
    status: 'Simple test successful',
    timestamp: new Date().toISOString(),
    message: 'Server is responding correctly'
  });
});

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`Webhook server running on port ${PORT}`);
  console.log(`Webhook URL: http://localhost:${PORT}/webhook/scrape`);
  console.log(`Health check: http://localhost:${PORT}/`);
  console.log(`Build test: http://localhost:${PORT}/test/build`);
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