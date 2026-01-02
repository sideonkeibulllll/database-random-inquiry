import { Hono } from 'hono';
import { handleDatabaseRequest, handleInsertData } from './api/database.js';
import { tokenAuth } from './utils/auth.js';
import { serve } from '@hono/node-server';

const app = new Hono();

// Public GET route for reading data (only read access)
app.get('/api/:dbAbbr', handleDatabaseRequest);

// Protected POST route for inserting data (requires token, only insert access)
app.post('/api/:dbAbbr', tokenAuth(), handleInsertData);

app.get('/', (c) => {
  return c.text('Database API is running. Use GET /api/:dbAbbr to access data, POST /api/:dbAbbr with token to insert data.');
});

// For Vercel and Cloudflare Workers
export default app;

// For local Node.js development
if (process.env.NODE_ENV !== 'production') {
  const port = 3000;
  serve({ fetch: app.fetch, port });
  console.log(`Server running on http://localhost:${port}`);
}
