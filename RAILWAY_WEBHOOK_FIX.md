# 🔧 Railway Webhook Fix Guide

## 🚨 **Issue Identified**

Your Railway deployment is working, but the webhook fails when triggering `npm run start` because:

1. **Missing Environment Variables** - OPENAI_API_KEY, Google credentials
2. **Process gets killed** (exit code 137 = SIGKILL) - likely memory/timeout issues
3. **No error handling** in the original webhook server

## ✅ **Fixes Applied**

I've updated your webhook server with:

### 🔍 **Better Error Handling**

- ✅ Environment variable validation before running scraper
- ✅ Detailed error logging with exit codes and signals
- ✅ Timeout protection (5 minutes max)
- ✅ Memory buffer limits
- ✅ Health check endpoint with environment status

### 🛠️ **New Endpoints**

- `GET /` - Health check + environment status
- `POST /webhook/scrape` - Trigger scraper (with validation)
- `GET /webhook/scrape` - Manual trigger (for testing)
- `GET /test/build` - Test TypeScript build only
- `npm run debug` - Local environment debugging

## 🎯 **Next Steps to Fix Railway**

### **Step 1: Set Environment Variables in Railway**

Go to your Railway project dashboard → **Variables** tab and add:

```bash
# Required for OpenAI
OPENAI_API_KEY=your_openai_api_key

# Required for Google Sheets
GOOGLE_SPREADSHEET_ID=your_google_spreadsheet_id

# Required for Google Authentication (choose ONE):
# Option A: Service Account JSON (recommended)
GOOGLE_SERVICE_ACCOUNT_JSON={"type":"service_account","project_id":"..."}

# Option B: Service Account Key File Path
GOOGLE_SERVICE_ACCOUNT_KEY_FILE=/path/to/service-account-key.json

# Option C: API Key (limited functionality)
GOOGLE_API_KEY=your_google_api_key
```

### **Step 2: Deploy Updated Code**

```bash
git add .
git commit -m "Fix webhook server with better error handling"
git push origin main
```

### **Step 3: Test the Deployment**

Once deployed, test these endpoints:

```bash
# Check health and environment status
curl https://your-app.railway.app/

# Should show:
# {
#   "status": "Scraper webhook server is running",
#   "env": {
#     "hasOpenAI": true,
#     "hasGoogleSpreadsheet": true,
#     "hasGoogleAuth": true
#   }
# }

# Test the webhook
curl -X POST https://your-app.railway.app/webhook/scrape

# Test build only (for debugging)
curl https://your-app.railway.app/test/build
```

## 🐛 **Debugging Steps**

### **If Environment Variables Are Missing:**

1. Check Railway Variables tab
2. Redeploy after adding variables
3. Test health endpoint: `curl https://your-app.railway.app/`

### **If Scraper Still Fails:**

1. Check Railway logs for detailed error messages
2. Try the build test endpoint: `/test/build`
3. Consider switching to Docker deployment

### **If Memory/Timeout Issues:**

1. **Switch to Docker** in Railway settings:
   - Go to Settings → Deploy
   - Change Builder from "Nixpacks" to "Dockerfile"
   - Redeploy

## 🐳 **Docker Alternative (Recommended)**

If Nixpacks continues to have issues, use Docker:

### **In Railway Dashboard:**

1. Go to your project
2. Click **Settings** → **Deploy**
3. Change **Builder** from "Nixpacks" to "Dockerfile"
4. Click **Deploy**

The Dockerfile I created handles:

- ✅ Proper Puppeteer setup
- ✅ All dependencies
- ✅ Security (non-root user)
- ✅ Health checks
- ✅ Memory optimization

## 🧪 **Local Testing**

Before deploying, test locally:

```bash
# Check environment
npm run debug

# Start webhook server
npm run webhook

# In another terminal:
# Test health check
curl http://localhost:3000/

# Test webhook (will show missing env vars)
curl -X POST http://localhost:3000/webhook/scrape

# Test build
curl http://localhost:3000/test/build
```

## 📊 **Expected Results**

### **With Missing Environment Variables:**

```json
{
  "status": "error",
  "message": "Missing required environment variables: OPENAI_API_KEY, GOOGLE_SPREADSHEET_ID, Google authentication",
  "timestamp": "2025-05-29T17:19:08.140Z"
}
```

### **With Proper Environment Variables:**

```json
{
  "status": "Scraper started",
  "timestamp": "2025-05-29T17:19:08.140Z",
  "message": "Scraping process initiated in background"
}
```

## 🎯 **Priority Actions**

1. **🔥 URGENT**: Set environment variables in Railway
2. **📤 Deploy**: Push the updated webhook server code
3. **🧪 Test**: Use the health check endpoint to verify
4. **🐳 Backup**: Switch to Docker if issues persist

The webhook server will now give you clear error messages instead of silent failures! 🚀
