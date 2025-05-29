# Railway Deployment Fix

## 🚨 Issue: Build Failed with TypeScript Errors

The Railway build is failing because it can't find the `googleapis` module during TypeScript compilation. Here are **3 solutions** to fix this:

## ✅ **Solution 1: Updated Configuration (Recommended)**

I've already updated your files with these fixes:

### Changes Made:

1. **Moved `ts-node` to dependencies** (was in devDependencies)
2. **Updated `railway.json`** to use simpler build process
3. **Added Dockerfile** as backup option

### Files Updated:

- ✅ `package.json` - ts-node moved to dependencies
- ✅ `railway.json` - simplified build command
- ✅ `Dockerfile` - added as alternative

### Deploy Again:

```bash
git add .
git commit -m "Fix Railway build issues"
git push origin main
```

Railway should now build successfully!

---

## ✅ **Solution 2: Use Docker Deployment**

If the Nixpacks build still fails, switch to Docker:

### In Railway Dashboard:

1. Go to your project settings
2. Click "Deploy" tab
3. Change "Builder" from "Nixpacks" to "Dockerfile"
4. Redeploy

The Dockerfile I created handles all dependencies correctly.

---

## ✅ **Solution 3: Pre-build Approach**

If you want to pre-build the TypeScript:

### Update `railway.json`:

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "npm install && npm run build"
  },
  "deploy": {
    "startCommand": "npm run webhook",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

### Update `package.json` scripts:

```json
{
  "scripts": {
    "start": "npm run scrape && npm run append-sheets",
    "scrape": "node dist/index.js",
    "webhook": "node webhook-server.js"
  }
}
```

This builds TypeScript during deployment instead of runtime.

---

## 🔍 **Why This Happened**

The error occurred because:

1. Railway was trying to compile TypeScript during build
2. `googleapis` wasn't installed yet during compilation
3. `ts-node` was in devDependencies (not installed in production)

## 🎯 **Recommended Next Steps**

1. **Try Solution 1 first** (already implemented)
2. If that fails, **switch to Docker** (Solution 2)
3. Monitor the build logs in Railway dashboard

## 🧪 **Test Locally First**

Before deploying, test that everything works:

```bash
# Test the build
npm run build

# Test the webhook server
npm run webhook

# In another terminal, test the webhook
curl -X POST http://localhost:3000/webhook/scrape
```

All should work without errors now! 🚀
