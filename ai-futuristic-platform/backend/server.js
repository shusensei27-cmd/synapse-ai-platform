// server.js — SYNAPSE Backend API
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const aiEngine = require('./aiEngine');
const db = require('./database');

const app = express();
const PORT = process.env.PORT || 3001;

// ── Security middleware ──
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: false,
}));

app.use(cors({
 origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60,
  message: { error: 'Too many requests. Slow down.' }
});
app.use('/api', limiter);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Request logger ──
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// ════════════════════════════════════
// ROUTES
// ════════════════════════════════════

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'SYNAPSE ONLINE', timestamp: new Date().toISOString() });
});

// ─── AI ROUTES ───
// Main chat endpoint
app.post('/api/ai/chat', async (req, res) => {
  const { message, userId, sessionId } = req.body;

  if (!message?.trim()) {
    return res.status(400).json({ error: 'Message is required' });
  }
  if (message.length > 2000) {
    return res.status(400).json({ error: 'Message too long (max 2000 chars)' });
  }

  try {
    const result = await aiEngine.processQuery({
      message: message.trim(),
      userId: userId || 'anonymous',
      sessionId: sessionId || `sess_${Date.now()}`,
    });

    res.json(result);
  } catch (err) {
    console.error('Chat error:', err);
    res.status(500).json({ error: 'AI engine error', detail: err.message });
  }
});

// Feedback endpoint
app.post('/api/ai/feedback', async (req, res) => {
  const { memoryId, score } = req.body;

  if (!memoryId) return res.status(400).json({ error: 'memoryId required' });
  if (![-1, 1].includes(score)) return res.status(400).json({ error: 'score must be -1 or 1' });

  try {
    await db.updateMemoryScore(memoryId, score);
    res.json({ success: true, message: 'Feedback applied' });
  } catch (err) {
    console.error('Feedback error:', err);
    res.status(500).json({ error: 'Could not apply feedback' });
  }
});

// AI stats
app.get('/api/ai/stats', async (req, res) => {
  try {
    const stats = await db.getStats();
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: 'Could not fetch stats' });
  }
});

// ─── CHAT HISTORY ROUTES ───
// Get user sessions
app.get('/api/chat/sessions', async (req, res) => {
  const { userId } = req.query;
  if (!userId) return res.status(400).json({ error: 'userId required' });

  try {
    const sessions = await db.getUserSessions(userId);
    res.json({ sessions });
  } catch (err) {
    console.error('Sessions error:', err);
    res.status(500).json({ error: 'Could not load sessions' });
  }
});

// Get session history
app.get('/api/chat/history/:sessionId', async (req, res) => {
  const { sessionId } = req.params;

  try {
    const messages = await db.getSessionHistory(sessionId);
    res.json({ messages });
  } catch (err) {
    console.error('History error:', err);
    res.status(500).json({ error: 'Could not load history' });
  }
});

// ─── MEMORY ROUTES ───
// View all memories (admin/debug)
app.get('/api/memory', async (req, res) => {
  try {
    const memories = await db.getAllMemories({ limit: 50 });
    res.json({ memories });
  } catch (err) {
    res.status(500).json({ error: 'Could not load memories' });
  }
});

// ── 404 handler ──
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// ── Error handler ──
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// ── Start ──
app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════╗
║   SYNAPSE BACKEND — ONLINE           ║
║   Port: ${PORT}                         ║
║   Mode: ${process.env.NODE_ENV || 'development'}                ║
╚══════════════════════════════════════╝
  `);
});

module.exports = app;
