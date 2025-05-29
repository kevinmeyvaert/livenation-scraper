const express = require('express');
const { exec } = require('child_process');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

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

// Webhook endpoint to trigger scraper
app.post('/webhook/scrape', (req, res) => {
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
  
  // Run scraper in background with timeout
  const scraperProcess = exec('npm run start', { 
    timeout: 300000, // 5 minutes timeout
    maxBuffer: 1024 * 1024 * 10 // 10MB buffer
  }, (error, stdout, stderr) => {
    if (error) {
      console.error('Scraper error:', error);
      console.error('Error code:', error.code);
      console.error('Error signal:', error.signal);
      console.error('Error killed:', error.killed);
      return;
    }
    console.log('Scraper stdout:', stdout);
    if (stderr) {
      console.error('Scraper stderr:', stderr);
    }
    console.log('Scraper completed successfully');
  });
  
  // Log process start
  console.log('Scraper process started with PID:', scraperProcess.pid);
});

// Optional: Endpoint to trigger scraper manually via GET
app.get('/webhook/scrape', (req, res) => {
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
  
  const scraperProcess = exec('npm run start', { 
    timeout: 300000, // 5 minutes timeout
    maxBuffer: 1024 * 1024 * 10 // 10MB buffer
  }, (error, stdout, stderr) => {
    if (error) {
      console.error('Scraper error:', error);
      console.error('Error code:', error.code);
      console.error('Error signal:', error.signal);
      console.error('Error killed:', error.killed);
      return;
    }
    console.log('Scraper stdout:', stdout);
    if (stderr) {
      console.error('Scraper stderr:', stderr);
    }
    console.log('Scraper completed successfully');
  });
  
  console.log('Scraper process started with PID:', scraperProcess.pid);
});

// Test endpoint to check just the build
app.get('/test/build', (req, res) => {
  console.log('Testing build process:', new Date().toISOString());
  
  res.json({ 
    status: 'Build test started', 
    timestamp: new Date().toISOString(),
    message: 'Testing TypeScript build process'
  });
  
  exec('npm run build', (error, stdout, stderr) => {
    if (error) {
      console.error('Build error:', error);
      return;
    }
    console.log('Build stdout:', stdout);
    if (stderr) {
      console.error('Build stderr:', stderr);
    }
    console.log('Build completed successfully');
  });
});

app.listen(PORT, () => {
  console.log(`Webhook server running on port ${PORT}`);
  console.log(`Webhook URL: http://localhost:${PORT}/webhook/scrape`);
  console.log(`Health check: http://localhost:${PORT}/`);
  console.log(`Build test: http://localhost:${PORT}/test/build`);
  
  // Check environment on startup
  const missingEnvVars = checkEnvironment();
  if (missingEnvVars.length > 0) {
    console.warn('⚠️  Missing environment variables:', missingEnvVars.join(', '));
    console.warn('⚠️  Scraper will fail until these are set!');
  } else {
    console.log('✅ All required environment variables are set');
  }
}); 