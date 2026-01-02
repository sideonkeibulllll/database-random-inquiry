import { dbManager } from '../utils/db.js';

export async function handleDatabaseRequest(c) {
  const dbAbbr = c.req.param('dbAbbr');
  
  try {
    const data = await dbManager.getRandomData(dbAbbr, 10);
    return c.json({
      success: true,
      data,
      count: data.length,
      database: dbAbbr
    });
  } catch (error) {
    return c.json({
      success: false,
      error: error.message,
      database: dbAbbr
    }, 500);
  }
}

export async function handleInsertData(c) {
  const dbAbbr = c.req.param('dbAbbr');
  
  try {
    const data = await c.req.json();
    if (!data || typeof data !== 'object') {
      return c.json({
        success: false,
        error: 'Invalid data format. Please provide a JSON object.',
        database: dbAbbr
      }, 400);
    }
    
    const result = await dbManager.insertData(dbAbbr, data);
    return c.json({
      success: true,
      data: result,
      message: 'Data inserted successfully',
      database: dbAbbr
    });
  } catch (error) {
    return c.json({
      success: false,
      error: error.message,
      database: dbAbbr
    }, 500);
  }
}
