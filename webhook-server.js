const express = require('express');
const { exec } = require('child_process');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Health check endpoint
app.get('/', (req, res) => {
  res.json({ status: 'Scraper webhook server is running', timestamp: new Date().toISOString() });
});

// Webhook endpoint to trigger scraper
app.post('/webhook/scrape', (req, res) => {
  console.log('Webhook received:', new Date().toISOString());
  console.log('Request body:', req.body);
  
  // Send immediate response
  res.json({ 
    status: 'Scraper started', 
    timestamp: new Date().toISOString(),
    message: 'Scraping process initiated in background'
  });
  
  // Run scraper in background
  exec('npm run start', (error, stdout, stderr) => {
    if (error) {
      console.error('Scraper error:', error);
      return;
    }
    console.log('Scraper stdout:', stdout);
    if (stderr) {
      console.error('Scraper stderr:', stderr);
    }
    console.log('Scraper completed successfully');
  });
});

// Optional: Endpoint to trigger scraper manually via GET
app.get('/webhook/scrape', (req, res) => {
  console.log('Manual scrape triggered:', new Date().toISOString());
  
  res.json({ 
    status: 'Scraper started', 
    timestamp: new Date().toISOString(),
    message: 'Scraping process initiated in background'
  });
  
  exec('npm run start', (error, stdout, stderr) => {
    if (error) {
      console.error('Scraper error:', error);
      return;
    }
    console.log('Scraper stdout:', stdout);
    if (stderr) {
      console.error('Scraper stderr:', stderr);
    }
    console.log('Scraper completed successfully');
  });
});

app.listen(PORT, () => {
  console.log(`Webhook server running on port ${PORT}`);
  console.log(`Webhook URL: http://localhost:${PORT}/webhook/scrape`);
}); 