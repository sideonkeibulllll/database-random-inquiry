import { dbManager } from '../utils/db.js';
import { validateStructureKey } from '../utils/auth.js';

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
    
    // Try to insert data first
    try {
      const result = await dbManager.insertData(dbAbbr, data);
      return c.json({
        success: true,
        data: result,
        message: 'Data inserted successfully',
        database: dbAbbr
      });
    } catch (insertError) {
      // Check if the error is about missing data structure
      if (insertError.message.includes('No collections found') || insertError.message.includes('No tables found')) {
        // Get the token from headers
        const token = c.req.header('Authorization')?.replace('Bearer ', '');
        
        // Validate structure API key
        if (!validateStructureKey(token)) {
          return c.json({
            success: false,
            error: 'Missing or invalid structure API key. Cannot create new data structure.',
            database: dbAbbr
          }, 401);
        }
        
        // If valid, try inserting again with structure creation allowed
        const result = await dbManager.insertData(dbAbbr, data, true);
        return c.json({
          success: true,
          data: result,
          message: 'Data structure created and data inserted successfully',
          database: dbAbbr
        });
      }
      
      // Re-throw other errors
      throw insertError;
    }
  } catch (error) {
    return c.json({
      success: false,
      error: error.message,
      database: dbAbbr
    }, 500);
  }
}
