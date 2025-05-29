#!/usr/bin/env node

console.log('🔍 Environment Debug Information');
console.log('================================');
console.log();

// Check Node.js version
console.log('📦 Node.js version:', process.version);
console.log('🏗️  Platform:', process.platform);
console.log('🏛️  Architecture:', process.arch);
console.log();

// Check environment variables
console.log('🔐 Environment Variables:');
console.log('- OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? '✅ Set' : '❌ Missing');
console.log('- GOOGLE_SPREADSHEET_ID:', process.env.GOOGLE_SPREADSHEET_ID ? '✅ Set' : '❌ Missing');
console.log('- GOOGLE_SERVICE_ACCOUNT_JSON:', process.env.GOOGLE_SERVICE_ACCOUNT_JSON ? '✅ Set' : '❌ Missing');
console.log('- GOOGLE_SERVICE_ACCOUNT_KEY_FILE:', process.env.GOOGLE_SERVICE_ACCOUNT_KEY_FILE ? '✅ Set' : '❌ Missing');
console.log('- GOOGLE_API_KEY:', process.env.GOOGLE_API_KEY ? '✅ Set' : '❌ Missing');
console.log('- PORT:', process.env.PORT || 'Not set (will use 3000)');
console.log();

// Check if we can import required modules
console.log('📚 Module Availability:');
try {
  require('express');
  console.log('- express: ✅ Available');
} catch (e) {
  console.log('- express: ❌ Missing');
}

try {
  require('googleapis');
  console.log('- googleapis: ✅ Available');
} catch (e) {
  console.log('- googleapis: ❌ Missing');
}

try {
  require('puppeteer');
  console.log('- puppeteer: ✅ Available');
} catch (e) {
  console.log('- puppeteer: ❌ Missing');
}

try {
  require('openai');
  console.log('- openai: ✅ Available');
} catch (e) {
  console.log('- openai: ❌ Missing');
}

try {
  require('typescript');
  console.log('- typescript: ✅ Available');
} catch (e) {
  console.log('- typescript: ❌ Missing');
}

try {
  require('ts-node');
  console.log('- ts-node: ✅ Available');
} catch (e) {
  console.log('- ts-node: ❌ Missing');
}

console.log();

// Check if dist directory exists
const fs = require('fs');
const path = require('path');

console.log('📁 File System:');
console.log('- dist/ directory:', fs.existsSync('./dist') ? '✅ Exists' : '❌ Missing');
console.log('- package.json:', fs.existsSync('./package.json') ? '✅ Exists' : '❌ Missing');
console.log('- src/ directory:', fs.existsSync('./src') ? '✅ Exists' : '❌ Missing');

if (fs.existsSync('./dist')) {
  console.log('- dist/index.js:', fs.existsSync('./dist/index.js') ? '✅ Exists' : '❌ Missing');
}

console.log();
console.log('🎯 Recommendations:');

const missing = [];
if (!process.env.OPENAI_API_KEY) missing.push('OPENAI_API_KEY');
if (!process.env.GOOGLE_SPREADSHEET_ID) missing.push('GOOGLE_SPREADSHEET_ID');
if (!process.env.GOOGLE_SERVICE_ACCOUNT_JSON && !process.env.GOOGLE_SERVICE_ACCOUNT_KEY_FILE && !process.env.GOOGLE_API_KEY) {
  missing.push('Google authentication');
}

if (missing.length > 0) {
  console.log('❌ Missing required environment variables:', missing.join(', '));
  console.log('   Set these in your Railway dashboard under Variables tab');
} else {
  console.log('✅ All required environment variables are set');
}

if (!fs.existsSync('./dist/index.js')) {
  console.log('❌ TypeScript not compiled. Run: npm run build');
} else {
  console.log('✅ TypeScript compiled successfully');
}

console.log();
console.log('🚀 Ready to test webhook server!'); 