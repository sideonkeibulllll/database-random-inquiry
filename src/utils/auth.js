export function tokenAuth() {
  return async (c, next) => {
    const token = c.req.header('Authorization')?.replace('Bearer ', '');
    const validToken = process.env.API_TOKEN;
    const validStructureToken = process.env.STRUCTURE_API_KEY;

    if (!validToken) {
      return c.json({ success: false, error: 'API token is not configured' }, 500);
    }

    if (!token || (token !== validToken && token !== validStructureToken)) {
      return c.json({ success: false, error: 'Invalid or missing token' }, 401);
    }

    await next();
  };
}

export function structureAuth() {
  return async (c, next) => {
    const token = c.req.header('Authorization')?.replace('Bearer ', '');
    const validStructureToken = process.env.STRUCTURE_API_KEY;

    if (!validStructureToken) {
      return c.json({ success: false, error: 'Structure API key is not configured' }, 500);
    }

    if (!token || token !== validStructureToken) {
      return c.json({ success: false, error: 'Invalid or missing structure API key' }, 401);
    }

    await next();
  };
}

export function validateStructureKey(token) {
  const validStructureToken = process.env.STRUCTURE_API_KEY;
  if (!validStructureToken) {
    return false;
  }
  return token === validStructureToken;
}
