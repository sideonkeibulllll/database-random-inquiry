import { Hono } from 'hono';
import { serveStatic } from '@hono/node-server/serve-static';
import { handleDatabaseRequest, handleInsertData } from './api/database.js';
import { tokenAuth } from './utils/auth.js';
import { serve } from '@hono/node-server';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables from .env file if available
import dotenv from 'dotenv';
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.join(__dirname, '../public');

const app = new Hono();

// Serve static files from public directory (highest priority) - only works in Node.js environment
if (process.env.NODE_ENV !== 'production' || process.env.VERCEL !== '1') {
  app.use('/*', serveStatic({ root: './public' }));
}

// Handle direct path access with .html extension fallback (e.g., /a -> a.html)
app.get('/:dbAbbr', async (c) => {
  const dbAbbr = c.req.param('dbAbbr');
  
  // Try to serve static HTML file first (only works in Node.js environment)
  const htmlPath = path.join(publicDir, `${dbAbbr}.html`);
  
  if (fs.existsSync(htmlPath)) {
    const html = fs.readFileSync(htmlPath, 'utf-8');
    return c.html(html);
  }
  
  // Fall back to API if no HTML file exists
  return handleDatabaseRequest(c);
});

// Public GET route for API access with path (e.g., /api/a/1 -> dbAbbr = a)
app.get('/api/:dbAbbr/*', handleDatabaseRequest);

// Public GET route for reading data (only read access)
app.get('/api/:dbAbbr', handleDatabaseRequest);

// Protected POST route for inserting data (requires token, only insert access)
app.post('/api/:dbAbbr', tokenAuth(), handleInsertData);

app.get('/', (c) => {
  return c.text('Database API is running. Use GET /api/:dbAbbr or direct /:dbAbbr to access data, POST /api/:dbAbbr with token to insert data.');
});

// For Vercel and Cloudflare Workers
export default app;

// For local Node.js development
if (process.env.NODE_ENV !== 'production') {
  const port = 3000;
  serve({ fetch: app.fetch, port });
  console.log(`Server running on http://localhost:${port}`);
}
