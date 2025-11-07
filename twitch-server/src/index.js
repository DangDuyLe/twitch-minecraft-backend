require('dotenv').config();
const express = require('express');
const cors = require('cors');
const database = require('./database.postgres');
const authRoutes = require('./routes/auth.routes');
const twitchRoutes = require('./routes/twitch.routes');
const webhookRoutes = require('./routes/webhook.routes');
const { router: eventsRoutes } = require('./routes/events.routes');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:8080',
    'http://localhost:8081',
    'http://localhost:8082',
    'http://localhost:8083',
    'http://localhost:3000',
    'https://minepath-arcade-airdrop.vercel.app'
  ],
  credentials: true
}));

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

const oauthRoutes = require('./routes/oauth.routes');

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/twitch', twitchRoutes);
app.use('/api/oauth', oauthRoutes);
app.use('/api/events', eventsRoutes);
app.use('/webhook', webhookRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'Twitch-Minecraft Integration Server',
    version: '2.0.0',
    endpoints: {
      auth: {
        register: 'POST /api/auth/register',
        login: 'POST /api/auth/login',
        logout: 'POST /api/auth/logout',
        me: 'GET /api/auth/me'
      },
      twitch: {
        subscribe: 'POST /api/twitch/subscribe',
        subscriptions: 'GET /api/twitch/subscriptions',
        deleteSubscription: 'DELETE /api/twitch/subscriptions/:id',
        setup: 'POST /api/twitch/setup'
      },
      webhook: 'POST /webhook/:userId'
    }
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    version: '2.0.0'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
async function start() {
  try {
    // Initialize database
    await database.initialize();

    // Start listening
    app.listen(PORT, () => {
      console.log(`
╔════════════════════════════════════════════════════════════════╗
║   🚀 Twitch-Minecraft Integration Server v2.0                 ║
║   📡 Running on port ${PORT}                                       ║
║   💾 Database: PostgreSQL                                      ║
║                                                                ║
║   📚 API Documentation:                                        ║
║   • Register: POST /api/auth/register                         ║
║   • Login:    POST /api/auth/login                            ║
║   • OAuth:    GET  /api/oauth/authorize-url                   ║
║   • Setup:    POST /api/twitch/setup                          ║
║                                                                ║
║   🔗 Webhook: POST /webhook/:userId                           ║
╚════════════════════════════════════════════════════════════════╝
      `);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

start();
