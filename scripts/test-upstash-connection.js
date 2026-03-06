/**
 * Test Upstash Vector connection using UPSTASH_VECTOR_REST_URL and UPSTASH_VECTOR_REST_TOKEN from .env.local
 * Run from RAG folder: node scripts/test-upstash-connection.js
 */

const path = require('path');
const fs = require('fs');

// Load .env.local from project root (RAG folder)
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  content.split('\n').forEach((line) => {
    const eq = line.indexOf('=');
    if (eq > 0) {
      const key = line.slice(0, eq).trim();
      const value = line.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
      if (key && !key.startsWith('#')) process.env[key] = value;
    }
  });
  console.log('Loaded .env.local from', envPath);
} else {
  console.error('.env.local not found at', envPath);
  process.exit(1);
}

const url = process.env.UPSTASH_VECTOR_REST_URL;
const token = process.env.UPSTASH_VECTOR_REST_TOKEN;

if (!url || !token) {
  console.error('UPSTASH_VECTOR_REST_URL and UPSTASH_VECTOR_REST_TOKEN must be set in .env.local');
  process.exit(1);
}

console.log('Upstash URL:', url);
console.log('Token:', token ? token.slice(0, 8) + '...' : '(missing)');
console.log('');

async function test() {
  const start = Date.now();
  console.log('Attempting to connect to Upstash Vector...');

  try {
    const { Index } = require('@upstash/vector');
    const index = new Index({ url, token });

    const info = await index.info();
    const elapsed = Date.now() - start;

    console.log('Connected successfully in', elapsed, 'ms');
    console.log('');
    console.log('Index info:');
    if (info.denseIndex) {
      console.log('  Dimension:', info.denseIndex.dimension);
      console.log('  Vector count:', info.denseIndex.vectorCount ?? 'N/A');
      console.log('  Similarity:', info.denseIndex.similarity ?? 'N/A');
    }
    if (info.namespaces && Object.keys(info.namespaces).length > 0) {
      console.log('  Namespaces:', Object.keys(info.namespaces).join(', '));
    }
    console.log('  Full response:', JSON.stringify(info, null, 2));
    console.log('');
    console.log('Upstash Vector connection test passed. Your app can use this for embeddings.');
    process.exit(0);
  } catch (err) {
    const elapsed = Date.now() - start;
    console.error('');
    console.error('Connection FAILED after', elapsed, 'ms');
    console.error('Error:', err.message);
    if (err.response) console.error('Response:', err.response);
    console.error('');
    console.error('Check that UPSTASH_VECTOR_REST_URL and UPSTASH_VECTOR_REST_TOKEN in .env.local match your Upstash Vector index (dashboard.upstash.com).');
    process.exit(1);
  }
}

test();
