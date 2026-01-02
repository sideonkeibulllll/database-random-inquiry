export function tokenAuth() {
  return async (c, next) => {
    const token = c.req.header('Authorization')?.replace('Bearer ', '');
    const validToken = process.env.API_TOKEN;

    if (!validToken) {
      return c.json({ success: false, error: 'API token is not configured' }, 500);
    }

    if (!token || token !== validToken) {
      return c.json({ success: false, error: 'Invalid or missing token' }, 401);
    }

    await next();
  };
}
