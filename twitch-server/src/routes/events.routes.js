const express = require('express');
const database = require('../database.postgres');
const authMiddleware = require('../auth');

const router = express.Router();

// Store recent events in memory (last 50 events per user)
const recentEvents = new Map();
const eventClients = new Map(); // SSE clients

function addEvent(userId, event) {
  if (!recentEvents.has(userId)) {
    recentEvents.set(userId, []);
  }
  
  const events = recentEvents.get(userId);
  events.unshift(event); // Add to beginning
  
  // Keep only last 50 events
  if (events.length > 50) {
    events.pop();
  }
  
  // Notify all connected SSE clients for this user
  const clients = eventClients.get(userId) || [];
  clients.forEach(client => {
    client.write(`data: ${JSON.stringify(event)}\n\n`);
  });
}

// Get recent events (last 50)
router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Verify user exists
    const user = await database.getUserById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const events = recentEvents.get(userId) || [];
    res.json({ events });
  } catch (error) {
    console.error('Get events error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Server-Sent Events (SSE) endpoint for realtime updates
router.get('/:userId/stream', async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Verify user exists
    const user = await database.getUserById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Set headers for SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    // Send initial connection message
    res.write(`data: ${JSON.stringify({ type: 'connected', message: 'Connected to event stream' })}\n\n`);
    
    // Add client to the list
    if (!eventClients.has(userId)) {
      eventClients.set(userId, []);
    }
    eventClients.get(userId).push(res);
    
    console.log(`📡 SSE client connected for user ${user.username}`);
    
    // Remove client on close
    req.on('close', () => {
      const clients = eventClients.get(userId) || [];
      const index = clients.indexOf(res);
      if (index !== -1) {
        clients.splice(index, 1);
      }
      console.log(`📡 SSE client disconnected for user ${user.username}`);
    });
    
  } catch (error) {
    console.error('SSE stream error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get event statistics
router.get('/:userId/stats', async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Verify user exists
    const user = await database.getUserById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const events = recentEvents.get(userId) || [];
    
    // Calculate stats
    const totalEvents = events.length;
    const eventTypes = events.reduce((acc, event) => {
      acc[event.eventType] = (acc[event.eventType] || 0) + 1;
      return acc;
    }, {});
    
    // Calculate total "value" (bits, subs, etc.)
    let totalValue = 0;
    events.forEach(event => {
      if (event.eventType === 'cheer') {
        totalValue += event.data.bits || 0;
      } else if (event.eventType === 'subscribe' || event.eventType === 'gift_subscription') {
        totalValue += 5; // Assume $5 per sub
      }
    });
    
    res.json({
      totalEvents,
      eventTypes,
      totalValue,
      recentEvents: events.slice(0, 10) // Last 10 events
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = { router, addEvent };

