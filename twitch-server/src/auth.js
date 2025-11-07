const database = require('./database.postgres');

// Middleware to verify session token
async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid authorization header' });
    }

    const token = authHeader.substring(7);
    const session = await database.getSession(token);

    if (!session) {
      return res.status(401).json({ error: 'Invalid or expired session' });
    }

    const user = await database.getUserById(session.userId);
    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'User not found or inactive' });
    }

    req.user = user;
    req.session = session;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// Middleware to verify API key (for webhook callbacks)
async function requireApiKey(req, res, next) {
  try {
    const apiKey = req.headers['x-api-key'];

    if (!apiKey) {
      return res.status(401).json({ error: 'Missing API key' });
    }

    const user = await database.getUserByApiKey(apiKey);
    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'Invalid API key' });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('API key middleware error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = {
  requireAuth,
  requireApiKey
};
