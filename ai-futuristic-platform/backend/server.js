// server.js — SYNAPSE Backend API
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const aiEngine = require('./aiEngine');
const db = require('./database');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: false,
}));

app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

const limiter = rateLimit({ windowMs: 60 * 1000, max: 60, message: { error: 'Too many requests.' } });
app.use('/api', limiter);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

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
app.post('/api/ai/chat', async (req, res) => {
  const { message, userId, sessionId } = req.body;
  if (!message?.trim()) return res.status(400).json({ error: 'Message is required' });
  if (message.length > 2000) return res.status(400).json({ error: 'Message too long' });

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

app.post('/api/ai/feedback', async (req, res) => {
  const { memoryId, score } = req.body;
  if (!memoryId) return res.status(400).json({ error: 'memoryId required' });
  if (![-1, 1].includes(score)) return res.status(400).json({ error: 'score must be -1 or 1' });

  try {
    await db.updateMemoryScore(memoryId, score);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Could not apply feedback' });
  }
});

app.get('/api/ai/stats', async (req, res) => {
  try {
    const stats = await db.getStats();
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: 'Could not fetch stats' });
  }
});

// ─── CHAT HISTORY ROUTES ───
app.get('/api/chat/sessions', async (req, res) => {
  const { userId } = req.query;
  if (!userId) return res.status(400).json({ error: 'userId required' });

  try {
    const sessions = await db.getUserSessions(userId);
    res.json({ sessions });
  } catch (err) {
    res.status(500).json({ error: 'Could not load sessions' });
  }
});

app.get('/api/chat/history/:sessionId', async (req, res) => {
  try {
    const messages = await db.getSessionHistory(req.params.sessionId);
    res.json({ messages });
  } catch (err) {
    res.status(500).json({ error: 'Could not load history' });
  }
});

// ─── DELETE CHAT HISTORY ROUTES ───
// DELETE /api/chat/clear?days=30  → hapus chat > 30 hari lalu
// DELETE /api/chat/clear?days=7   → hapus chat > 7 hari lalu
// DELETE /api/chat/clear          → hapus semua chat
app.delete('/api/chat/clear', async (req, res) => {
  const { days } = req.query;

  try {
    let deleted = 0;

    if (days && !isNaN(parseInt(days))) {
      const cutoff = new Date(Date.now() - parseInt(days) * 24 * 60 * 60 * 1000).toISOString();
      deleted = await db.deleteChatBefore(cutoff);
    } else {
      deleted = await db.deleteAllChat();
    }

    res.json({
      success: true,
      deleted,
      message: `Berhasil menghapus ${deleted} pesan chat`
    });
  } catch (err) {
    console.error('Delete chat error:', err);
    res.status(500).json({ error: 'Gagal hapus chat: ' + err.message });
  }
});

// ─── MEMORY ROUTES ───
app.get('/api/memory', async (req, res) => {
  try {
    const memories = await db.getAllMemories({ limit: 200 });
    res.json({ memories });
  } catch (err) {
    res.status(500).json({ error: 'Could not load memories' });
  }
});

app.post('/api/memory', async (req, res) => {
  const { question, answer, score } = req.body;
  if (!question?.trim()) return res.status(400).json({ error: 'question required' });
  if (!answer?.trim())   return res.status(400).json({ error: 'answer required' });

  try {
    const id = await db.storeMemory({ question: question.trim(), answer: answer.trim(), score: score || 5 });
    res.json({ success: true, id });
  } catch (err) {
    res.status(500).json({ error: 'Could not store memory: ' + err.message });
  }
});

// ── 404 ──
app.use((req, res) => res.status(404).json({ error: 'Route not found' }));

// ── Error ──
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

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