// aiEngine.js — SYNAPSE Adaptive Learning Engine
const Fuse = require('fuse.js');
const db = require('./database');

// ════════════════════════════════════
// DEFAULT AI RESPONSES
// ════════════════════════════════════
const DEFAULT_RESPONSES = [
  {
    triggers: ['hello', 'hi', 'hey', 'greetings', 'good morning', 'good afternoon'],
    answer: "**Hello! I'm SYNAPSE** — a self-learning AI system.\n\nI get smarter with every conversation. My memory bank grows each time you ask a question, and I learn from your feedback to improve future responses.\n\nWhat would you like to explore today?"
  },
  {
    triggers: ['how are you', 'how do you feel', 'how you doing'],
    answer: "I'm operating at **full neural capacity** ⚡\n\nMy memory banks are growing, my similarity engine is calibrated, and I'm ready to learn from your queries. Every conversation makes me more accurate.\n\nWhat's on your mind?"
  },
  {
    triggers: ['what can you do', 'what are you', 'what is synapse', 'who are you', 'your capabilities'],
    answer: "**SYNAPSE** is an adaptive AI platform with memory-based learning.\n\nHere's what I do:\n\n- **Remember** — I store every conversation in my memory bank\n- **Learn** — I improve my answers based on your feedback\n- **Match** — I find similar past questions to give you the best answers\n- **Evolve** — My accuracy increases with each interaction\n\nUnlike static AI systems, I genuinely get better over time."
  },
  {
    triggers: ['how does memory work', 'how do you learn', 'how does learning work', 'learning system', 'memory system'],
    answer: "**My Memory System:**\n\n1. **Receive** — You send a query\n2. **Search** — I search my memory bank using fuzzy similarity matching\n3. **Match** — If I find a similar past question with high confidence, I return that answer\n4. **Default** — If no match exists, I generate a response and store it\n5. **Feedback Loop** — When you rate my answer, I adjust the score in my memory\n\nHigher-scored memories are preferred in future matches. Over time, bad answers get deprioritized and good ones rise to the top."
  },
  {
    triggers: ['adaptive ai', 'adaptive intelligence', 'self learning', 'machine learning', 'ai systems'],
    answer: "**Adaptive AI Systems** learn and improve from experience rather than being statically programmed.\n\nSYNAPSE implements a simple but effective form of this:\n\n- **Episodic Memory** — Storing past question-answer pairs\n- **Similarity Search** — Finding relevant past knowledge using fuzzy matching\n- **Reinforcement** — Score-based feedback improves answer quality\n- **Continuous Learning** — New knowledge is always being added\n\nThis is inspired by how human memory works — we recall similar past experiences to handle new situations."
  },
  {
    triggers: ['what is ai', 'explain ai', 'artificial intelligence'],
    answer: "**Artificial Intelligence (AI)** refers to computer systems that can perform tasks typically requiring human intelligence.\n\nKey branches include:\n\n- **Machine Learning** — Systems that learn from data\n- **Natural Language Processing** — Understanding human language\n- **Computer Vision** — Interpreting visual information\n- **Robotics** — Physical AI systems\n\nModern AI like large language models (LLMs) are trained on massive datasets, but systems like SYNAPSE use simpler, more interpretable memory-based approaches."
  },
  {
    triggers: ['tell me a joke', 'joke', 'something funny', 'humor'],
    answer: "**A neural network joke:**\n\nWhy did the AI fail its exam?\n\nBecause it had *too many parameters* and not enough *training data*. 🤖\n\n*(Unlike me — I learn from every single conversation!)*"
  },
];

// ════════════════════════════════════
// SIMILARITY ENGINE
// ════════════════════════════════════

/**
 * Normalize text for comparison
 */
function normalize(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ');
}

/**
 * Extract keywords from text
 */
function extractKeywords(text) {
  const stopWords = new Set([
    'the','a','an','is','are','was','were','be','been','being',
    'have','has','had','do','does','did','will','would','could',
    'should','may','might','shall','can','i','you','he','she',
    'it','we','they','my','your','his','her','its','our','their',
    'what','how','why','when','where','which','who','that','this',
    'these','those','with','for','on','at','to','from','by','in',
    'of','and','or','but','not','so','if','then','than','more',
    'me','us','him','them','just','about','up','out','go','get'
  ]);
  return normalize(text)
    .split(' ')
    .filter(w => w.length > 2 && !stopWords.has(w));
}

/**
 * Cosine similarity between two keyword arrays
 */
function cosineSimilarity(keywordsA, keywordsB) {
  if (!keywordsA.length || !keywordsB.length) return 0;

  const freqA = {}, freqB = {};
  keywordsA.forEach(w => freqA[w] = (freqA[w] || 0) + 1);
  keywordsB.forEach(w => freqB[w] = (freqB[w] || 0) + 1);

  const allWords = new Set([...Object.keys(freqA), ...Object.keys(freqB)]);
  let dotProduct = 0, magA = 0, magB = 0;

  allWords.forEach(w => {
    const a = freqA[w] || 0, b = freqB[w] || 0;
    dotProduct += a * b;
    magA += a * a;
    magB += b * b;
  });

  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  return denom === 0 ? 0 : dotProduct / denom;
}

/**
 * Jaccard similarity (keyword overlap)
 */
function jaccardSimilarity(keywordsA, keywordsB) {
  const setA = new Set(keywordsA), setB = new Set(keywordsB);
  const intersection = [...setA].filter(x => setB.has(x)).length;
  const union = new Set([...setA, ...setB]).size;
  return union === 0 ? 0 : intersection / union;
}

/**
 * Combined similarity score
 */
function computeSimilarity(queryKeywords, memKeywords) {
  const cosine = cosineSimilarity(queryKeywords, memKeywords);
  const jaccard = jaccardSimilarity(queryKeywords, memKeywords);
  // Weighted average (cosine is more informative for longer texts)
  return 0.6 * cosine + 0.4 * jaccard;
}

// ════════════════════════════════════
// DEFAULT RESPONSE MATCHER
// ════════════════════════════════════
function matchDefault(query) {
  const norm = normalize(query);
  const keywords = extractKeywords(query);

  let bestMatch = null;
  let bestScore = 0;

  for (const item of DEFAULT_RESPONSES) {
    for (const trigger of item.triggers) {
      // Exact substring match
      if (norm.includes(trigger)) {
        const score = trigger.length / norm.length + 0.5;
        if (score > bestScore) { bestScore = score; bestMatch = item.answer; }
      }
      // Keyword similarity
      const triggerKw = extractKeywords(trigger);
      const sim = jaccardSimilarity(keywords, triggerKw);
      if (sim > bestScore) { bestScore = sim; bestMatch = item.answer; }
    }
  }

  return bestScore > 0.2 ? { answer: bestMatch, score: bestScore } : null;
}

// ════════════════════════════════════
// GENERIC RESPONSE GENERATOR
// ════════════════════════════════════
function generateGenericResponse(query) {
  const templates = [
    `That's an interesting question about **"${query.slice(0, 50)}${query.length > 50 ? '...' : ''}"**.\n\nI've logged this to my memory bank and will improve my answer as I learn more from conversations.\n\nCould you rephrase or provide more context? The more specific you are, the better I can assist — and I'll remember this for next time!`,

    `I don't have a strong match in my memory bank for your query yet.\n\n**What I can tell you:**\nSYNAPSE learns from every conversation. Once this topic comes up a few times and gets positive feedback, I'll have a much better answer stored.\n\nFor now, try asking follow-up questions to help me build context around this topic.`,

    `**Query received:** "${query.slice(0, 60)}..."\n\n**Memory match:** No high-confidence match found\n\nThis appears to be a new topic for my neural core. I've stored your question and will learn from this interaction.\n\nTip: Rate my responses using the feedback buttons — it helps me improve!`,
  ];

  return templates[Math.floor(Math.random() * templates.length)];
}

// ════════════════════════════════════
// FUSE.JS FUZZY SEARCH
// ════════════════════════════════════
function fuseSearch(query, memories) {
  if (!memories.length) return [];

  const fuse = new Fuse(memories, {
    keys: ['question'],
    threshold: 0.45,        // Lower = stricter
    includeScore: true,
    minMatchCharLength: 3,
    ignoreLocation: true,
    useExtendedSearch: false,
  });

  return fuse.search(query)
    .map(r => ({
      ...r.item,
      fuseScore: 1 - (r.score || 0), // Convert Fuse score (lower=better) to similarity (higher=better)
    }));
}

// ════════════════════════════════════
// MAIN PROCESS QUERY
// ════════════════════════════════════
async function processQuery({ message, userId, sessionId }) {
  const SIMILARITY_THRESHOLD = 0.38;
  const queryKeywords = extractKeywords(message);

  // 1. Load memories from DB
  const memories = await db.getAllMemories({ limit: 200 });

  let bestAnswer = null;
  let bestScore = 0;
  let bestMemoryId = null;
  let isFromMemory = false;

  if (memories.length > 0) {
    // 2a. Fuse.js fuzzy search
    const fuseResults = fuseSearch(message, memories);

    // 2b. Keyword similarity for all memories
    const scoredMemories = memories.map(mem => {
      const memKeywords = extractKeywords(mem.question);
      const kwSim = computeSimilarity(queryKeywords, memKeywords);

      // Check if it appeared in fuse results
      const fuseResult = fuseResults.find(f => f.id === mem.id);
      const fuseScore = fuseResult ? fuseResult.fuseScore : 0;

      // Combine scores, also incorporate stored score (normalized to 0-1 range for boost)
      const scoreBoost = Math.max(0, Math.min(1, (mem.score + 10) / 20)); // normalize -10..10 → 0..1
      const combined = (kwSim * 0.5) + (fuseScore * 0.4) + (scoreBoost * 0.1);

      return { ...mem, similarity: combined };
    });

    // 3. Sort by similarity
    scoredMemories.sort((a, b) => b.similarity - a.similarity);

    const top = scoredMemories[0];
    if (top && top.similarity >= SIMILARITY_THRESHOLD && top.score >= -5) {
      bestAnswer = top.answer;
      bestScore = top.similarity;
      bestMemoryId = top.id;
      isFromMemory = true;
      console.log(`[AI] Memory match: "${top.question}" (sim=${top.similarity.toFixed(3)})`);
    }
  }

  // 4. Fallback: default responses
  if (!bestAnswer) {
    const defaultMatch = matchDefault(message);
    if (defaultMatch) {
      bestAnswer = defaultMatch.answer;
      bestScore = defaultMatch.score;
      console.log(`[AI] Default response matched (score=${bestScore.toFixed(2)})`);
    }
  }

  // 5. Final fallback: generic
  if (!bestAnswer) {
    bestAnswer = generateGenericResponse(message);
    bestScore = 0;
    console.log('[AI] Generic fallback response');
  }

  // 6. Store this conversation in memory (if not already from memory)
  const newMemoryId = bestMemoryId || await db.storeMemory({
    question: message,
    answer: bestAnswer,
    score: 0,
  });

  // 7. Store in chat history
  await db.storeChatMessage({
    sessionId,
    userId,
    message,
    role: 'user',
    memoryId: newMemoryId,
    similarity: bestScore,
  });

  await db.storeChatMessage({
    sessionId,
    userId,
    message: bestAnswer,
    role: 'ai',
    memoryId: newMemoryId,
    similarity: bestScore,
    isFromMemory,
  });

  return {
    answer: bestAnswer,
    memoryId: newMemoryId,
    similarity: bestScore,
    isFromMemory,
    timestamp: new Date().toISOString(),
  };
}

// ════════════════════════════════════
// EXPORTS
// ════════════════════════════════════
module.exports = {
  processQuery,
  computeSimilarity,
  extractKeywords,
  cosineSimilarity,
  jaccardSimilarity,
};
