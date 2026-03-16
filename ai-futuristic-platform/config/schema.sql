-- ══════════════════════════════════════════════
-- SYNAPSE DATABASE SCHEMA
-- Run this in your Supabase SQL Editor
-- ══════════════════════════════════════════════

-- Enable UUID extension (usually already enabled)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── TABLE: ai_memory ──────────────────────────
-- Stores all learned question-answer pairs
CREATE TABLE IF NOT EXISTS ai_memory (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  question    TEXT NOT NULL,
  answer      TEXT NOT NULL,
  score       INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for faster searches
CREATE INDEX IF NOT EXISTS idx_ai_memory_score ON ai_memory (score DESC);
CREATE INDEX IF NOT EXISTS idx_ai_memory_created ON ai_memory (created_at DESC);

-- ── TABLE: chat_history ───────────────────────
-- Stores all chat messages per session
CREATE TABLE IF NOT EXISTS chat_history (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id      TEXT NOT NULL,
  user_id         TEXT NOT NULL,
  message         TEXT NOT NULL,
  role            TEXT NOT NULL CHECK (role IN ('user', 'ai')),
  memory_id       UUID REFERENCES ai_memory(id) ON DELETE SET NULL,
  similarity      NUMERIC(5,3) DEFAULT 0,
  is_from_memory  BOOLEAN DEFAULT FALSE,
  timestamp       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for chat queries
CREATE INDEX IF NOT EXISTS idx_chat_session ON chat_history (session_id);
CREATE INDEX IF NOT EXISTS idx_chat_user    ON chat_history (user_id);
CREATE INDEX IF NOT EXISTS idx_chat_ts      ON chat_history (timestamp DESC);

-- ── ROW LEVEL SECURITY ────────────────────────
-- Enable RLS (Row Level Security)
ALTER TABLE ai_memory    ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_history ENABLE ROW LEVEL SECURITY;

-- ai_memory: readable by anyone (public knowledge base), writable by service role only
CREATE POLICY "ai_memory_read_all" ON ai_memory
  FOR SELECT USING (true);

CREATE POLICY "ai_memory_service_write" ON ai_memory
  FOR ALL USING (auth.role() = 'service_role');

-- chat_history: users can read their own, service role has full access
CREATE POLICY "chat_history_service" ON chat_history
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "chat_history_user_read" ON chat_history
  FOR SELECT USING (user_id = auth.uid()::text);

-- ── SEED DATA (optional starter knowledge) ────
INSERT INTO ai_memory (question, answer, score) VALUES
  (
    'What is SYNAPSE?',
    '**SYNAPSE** is an adaptive AI platform that learns from every conversation.

Unlike static AI systems, SYNAPSE stores knowledge in a memory bank and improves its responses based on user feedback. The more conversations it processes, the smarter it becomes.',
    5
  ),
  (
    'How does SYNAPSE learn?',
    '**SYNAPSE Learning Process:**

1. **Receive** — User sends a query
2. **Search** — AI searches memory bank using fuzzy matching + cosine similarity  
3. **Match** — Best matching past answer is returned with confidence score
4. **Store** — New knowledge is added to the memory bank
5. **Feedback** — User ratings adjust answer scores

High-scoring answers are preferred in future matches.',
    4
  ),
  (
    'What is machine learning?',
    '**Machine Learning (ML)** is a subset of AI where systems learn from data without being explicitly programmed for every scenario.

**Key types:**
- **Supervised Learning** — Learning from labeled examples
- **Unsupervised Learning** — Finding patterns in unlabeled data  
- **Reinforcement Learning** — Learning through rewards and penalties

SYNAPSE uses a simplified memory-based approach inspired by instance-based learning.',
    3
  ),
  (
    'Explain neural networks',
    '**Neural Networks** are computing systems loosely inspired by biological neural networks in the brain.

They consist of:
- **Input Layer** — Receives raw data
- **Hidden Layers** — Process and transform data
- **Output Layer** — Produces the final result

Each connection has a **weight** that adjusts during training, allowing the network to learn complex patterns.

Modern deep learning uses many hidden layers (hence "deep") to solve complex problems like image recognition and language understanding.',
    2
  ),
  (
    'What is natural language processing?',
    '**Natural Language Processing (NLP)** is the branch of AI focused on enabling computers to understand, interpret, and generate human language.

**Key NLP tasks:**
- **Text Classification** — Categorizing text (spam detection, sentiment)
- **Named Entity Recognition** — Identifying names, places, dates
- **Machine Translation** — Converting between languages
- **Question Answering** — Responding to queries in natural language

SYNAPSE uses basic NLP techniques like keyword extraction and fuzzy matching to understand your queries.',
    2
  )
ON CONFLICT DO NOTHING;

-- ══════════════════════════════════════════════
-- DONE! Your SYNAPSE database is ready.
-- ══════════════════════════════════════════════
