// database.js — SYNAPSE Database Interface (Supabase)
const { createClient } = require('@supabase/supabase-js');

// ════════════════════════════════════
// SUPABASE CLIENT
// ════════════════════════════════════
const supabaseUrl  = process.env.SUPABASE_URL;
const supabaseKey  = process.env.SUPABASE_SERVICE_ROLE_KEY; // Use service role on backend

let supabase = null;

function getClient() {
  if (!supabase) {
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase credentials not set. Check SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars.');
    }
    supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });
  }
  return supabase;
}

// ════════════════════════════════════
// MEMORY FUNCTIONS (ai_memory table)
// ════════════════════════════════════

/**
 * Get all memories for similarity search
 */
async function getAllMemories({ limit = 200 } = {}) {
  const sb = getClient();
  const { data, error } = await sb
    .from('ai_memory')
    .select('id, question, answer, score, created_at')
    .order('score', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('[DB] getAllMemories error:', error.message);
    return [];
  }
  return data || [];
}

/**
 * Store a new memory entry
 * Returns the ID of the created record
 */
async function storeMemory({ question, answer, score = 0 }) {
  const sb = getClient();

  // Check if exact question already exists
  const { data: existing } = await sb
    .from('ai_memory')
    .select('id')
    .ilike('question', question.trim())
    .limit(1);

  if (existing && existing.length > 0) {
    return existing[0].id;
  }

  const { data, error } = await sb
    .from('ai_memory')
    .insert({ question: question.trim(), answer: answer.trim(), score })
    .select('id')
    .single();

  if (error) {
    console.error('[DB] storeMemory error:', error.message);
    return null;
  }
  return data?.id || null;
}

/**
 * Update memory score by delta (+1 or -1)
 */
async function updateMemoryScore(memoryId, delta) {
  const sb = getClient();

  // Get current score first
  const { data: current, error: fetchErr } = await sb
    .from('ai_memory')
    .select('score')
    .eq('id', memoryId)
    .single();

  if (fetchErr) {
    console.error('[DB] updateMemoryScore fetch error:', fetchErr.message);
    return false;
  }

  const newScore = (current?.score || 0) + delta;

  const { error } = await sb
    .from('ai_memory')
    .update({ score: newScore })
    .eq('id', memoryId);

  if (error) {
    console.error('[DB] updateMemoryScore update error:', error.message);
    return false;
  }
  return true;
}

// ════════════════════════════════════
// CHAT HISTORY FUNCTIONS
// ════════════════════════════════════

/**
 * Store a chat message
 */
async function storeChatMessage({ sessionId, userId, message, role, memoryId = null, similarity = 0, isFromMemory = false }) {
  const sb = getClient();
  const { error } = await sb.from('chat_history').insert({
    session_id: sessionId,
    user_id: userId,
    message: message.trim(),
    role,
    memory_id: memoryId,
    similarity: Math.round((similarity || 0) * 1000) / 1000,
    is_from_memory: isFromMemory,
    timestamp: new Date().toISOString(),
  });

  if (error) {
    console.error('[DB] storeChatMessage error:', error.message);
    return false;
  }
  return true;
}

/**
 * Get chat history for a session
 */
async function getSessionHistory(sessionId) {
  const sb = getClient();
  const { data, error } = await sb
    .from('chat_history')
    .select('id, message, role, timestamp, memory_id, similarity, is_from_memory')
    .eq('session_id', sessionId)
    .order('timestamp', { ascending: true });

  if (error) {
    console.error('[DB] getSessionHistory error:', error.message);
    return [];
  }

  return (data || []).map(row => ({
    id: row.id,
    message: row.message,
    role: row.role,
    timestamp: row.timestamp,
    memoryId: row.memory_id,
    similarity: row.similarity,
    isFromMemory: row.is_from_memory,
  }));
}

/**
 * Get all unique sessions for a user (with preview text)
 */
async function getUserSessions(userId) {
  const sb = getClient();

  // Get sessions (distinct session_id with first user message)
  const { data, error } = await sb
    .from('chat_history')
    .select('session_id, message, timestamp')
    .eq('user_id', userId)
    .eq('role', 'user')
    .order('timestamp', { ascending: true });

  if (error) {
    console.error('[DB] getUserSessions error:', error.message);
    return [];
  }

  // Group by session_id, keep first message as preview
  const sessionsMap = new Map();
  (data || []).forEach(row => {
    if (!sessionsMap.has(row.session_id)) {
      sessionsMap.set(row.session_id, {
        sessionId: row.session_id,
        preview: row.message?.slice(0, 50) || 'Chat session',
        timestamp: row.timestamp,
      });
    }
    // Update timestamp to latest
    sessionsMap.get(row.session_id).timestamp = row.timestamp;
  });

  return [...sessionsMap.values()]
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, 30); // Last 30 sessions
}

// ════════════════════════════════════
// STATS
// ════════════════════════════════════
async function getStats() {
  const sb = getClient();

  const [{ count: totalMemories }, { data: scores }] = await Promise.all([
    sb.from('ai_memory').select('*', { count: 'exact', head: true }),
    sb.from('ai_memory').select('score').gte('score', 1),
  ]);

  const positiveCount = scores?.length || 0;
  const accuracy = totalMemories > 0
    ? Math.round((positiveCount / totalMemories) * 100)
    : 0;

  return {
    totalMemories: totalMemories || 0,
    accuracy,
    positiveCount,
  };
}

// ════════════════════════════════════
// DB HEALTH CHECK
// ════════════════════════════════════
async function healthCheck() {
  try {
    const sb = getClient();
    const { error } = await sb.from('ai_memory').select('id').limit(1);
    return !error;
  } catch (e) {
    return false;
  }
}

module.exports = {
  getAllMemories,
  storeMemory,
  updateMemoryScore,
  storeChatMessage,
  getSessionHistory,
  getUserSessions,
  getStats,
  healthCheck,
};
