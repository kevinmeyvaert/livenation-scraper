# Deployment Guide: Webhook-Triggered Scraper

This guide covers the easiest ways to host your LiveNation scraper so it can be triggered via webhooks.

## 🚀 Option 1: Railway (Recommended - Easiest)

Railway is the simplest option with automatic deployments and built-in environment variable management.

### Steps:

1. **Install Express dependency:**

   ```bash
   npm install express
   ```

2. **Push to GitHub** (if not already):

   ```bash
   git add .
   git commit -m "Add webhook server"
   git push origin main
   ```

3. **Deploy to Railway:**

   - Go to [railway.app](https://railway.app)
   - Sign up/login with GitHub
   - Click "New Project" → "Deploy from GitHub repo"
   - Select your repository
   - Railway will automatically detect it's a Node.js project

4. **Set Environment Variables:**

   - In Railway dashboard, go to your project
   - Click "Variables" tab
   - Add all your environment variables:
     - `OPENAI_API_KEY`
     - `GOOGLE_SPREADSHEET_ID`
     - `GOOGLE_SERVICE_ACCOUNT_JSON` (paste the entire JSON content)

5. **Get your webhook URL:**
   - After deployment, Railway provides a URL like: `https://your-app.railway.app`
   - Your webhook endpoint will be: `https://your-app.railway.app/webhook/scrape`

### Usage:

```bash
# Trigger scraper via POST request
curl -X POST https://your-app.railway.app/webhook/scrape

# Or trigger via GET request (for testing)
curl https://your-app.railway.app/webhook/scrape
```

**Cost:** Free tier includes 500 hours/month (enough for webhook-triggered scraping)

---

## 🔧 Option 2: Render

Similar to Railway but with slightly more configuration.

### Steps:

1. **Create render.yaml:**

   ```yaml
   services:
     - type: web
       name: livenation-scraper
       env: node
       buildCommand: npm install
       startCommand: npm run webhook
       envVars:
         - key: NODE_ENV
           value: production
   ```

2. **Deploy:**

   - Go to [render.com](https://render.com)
   - Connect GitHub repository
   - Render auto-detects the configuration

3. **Set Environment Variables** in Render dashboard

**Cost:** Free tier available

---

## ⚡ Option 3: Vercel (Serverless)

Best for infrequent scraping due to serverless nature.

### Steps:

1. **Create vercel.json:**

   ```json
   {
     "functions": {
       "webhook-server.js": {
         "maxDuration": 300
       }
     }
   }
   ```

2. **Deploy:**

   ```bash
   npx vercel --prod
   ```

3. **Set Environment Variables:**
   ```bash
   vercel env add OPENAI_API_KEY
   vercel env add GOOGLE_SPREADSHEET_ID
   vercel env add GOOGLE_SERVICE_ACCOUNT_JSON
   ```

**Note:** Vercel has a 10-second timeout on free tier, so you might need to upgrade for longer scraping jobs.

---

## 🐳 Option 4: Docker + Any Cloud Provider

For maximum control and portability.

### Dockerfile:

```dockerfile
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm install

# Install Chromium for Puppeteer
RUN apk add --no-cache chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

COPY . .
RUN npm run build

EXPOSE 3000
CMD ["npm", "run", "webhook"]
```

Deploy to:

- **Google Cloud Run** (easiest)
- **AWS ECS Fargate**
- **DigitalOcean App Platform**

---

## 🔄 Setting Up Automated Triggers

### GitHub Actions (Scheduled)

Create `.github/workflows/scraper.yml`:

```yaml
name: Scheduled Scraping
on:
  schedule:
    - cron: '0 9 * * *' # Daily at 9 AM UTC
  workflow_dispatch: # Manual trigger

jobs:
  trigger-scraper:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Webhook
        run: |
          curl -X POST ${{ secrets.WEBHOOK_URL }}/webhook/scrape
```

### Zapier/IFTTT

- Create a webhook trigger in Zapier
- Connect to your deployed webhook URL
- Set up triggers (time-based, email-based, etc.)

### Cron Jobs (if you have a server)

```bash
# Add to crontab for daily scraping at 9 AM
0 9 * * * curl -X POST https://your-app.railway.app/webhook/scrape
```

---

## 🧪 Testing Your Webhook

1. **Local testing:**

   ```bash
   npm run webhook
   # In another terminal:
   curl -X POST http://localhost:3000/webhook/scrape
   ```

2. **Production testing:**

   ```bash
   curl -X POST https://your-deployed-url/webhook/scrape
   ```

3. **Check logs** in your hosting platform dashboard

---

## 📊 Monitoring & Logs

- **Railway:** Built-in logs in dashboard
- **Render:** Logs available in dashboard
- **Vercel:** Function logs in dashboard

## 🔒 Security Considerations

For production use, consider adding:

1. **Webhook authentication:**

   ```javascript
   app.post('/webhook/scrape', (req, res) => {
     const authHeader = req.headers.authorization;
     if (authHeader !== `Bearer ${process.env.WEBHOOK_SECRET}`) {
       return res.status(401).json({ error: 'Unauthorized' });
     }
     // ... rest of webhook logic
   });
   ```

2. **Rate limiting:**
   ```bash
   npm install express-rate-limit
   ```

## 🎯 Recommendation

**Start with Railway** - it's the easiest option with:

- ✅ Automatic deployments from GitHub
- ✅ Built-in environment variable management
- ✅ Free tier sufficient for webhook scraping
- ✅ Simple setup process
- ✅ Good logging and monitoring
