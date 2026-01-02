import { Hono } from 'hono';
import { handleDatabaseRequest, handleInsertData } from './api/database.js';
import { tokenAuth } from './utils/auth.js';
import { serve } from '@hono/node-server';

// Load environment variables from .env file if available
import dotenv from 'dotenv';
dotenv.config();

const app = new Hono();

// Public GET route for API access with path (e.g., /api/a/1 -> dbAbbr = a)
app.get('/api/:dbAbbr/*', handleDatabaseRequest);

// Public GET route for reading data (only read access)
app.get('/api/:dbAbbr', handleDatabaseRequest);

// Public GET route for direct path access (e.g., /a/1 -> /api/a)
app.get('/:dbAbbr/*', handleDatabaseRequest);

// Public GET route for direct db access (e.g., /a -> /api/a)
app.get('/:dbAbbr', handleDatabaseRequest);

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
