/* app.js — SYNAPSE Core Application Controller */

// ════════════════════════════════════
// CONFIG — Update these with your values
// ════════════════════════════════════
window.SYNAPSE_API = window.location.hostname === 'localhost'
  ? 'http://localhost:3001/api'
  : 'https://YOUR-BACKEND.onrender.com/api'; // <-- Set your Render URL here

const SUPABASE_URL = 'https://fkyuvapmeiezilwnqrcn.supabase.co';     // <-- Set your Supabase URL
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZreXV2YXBtZWllemlsd25xcmNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM2NDgyMTAsImV4cCI6MjA4OTIyNDIxMH0.7PjJX5IRb-xU7IPlamlnuVy05nbZD59PlgqktbyewMM';   // <-- Set your Supabase anon key

// ════════════════════════════════════
// SUPABASE CLIENT
// ════════════════════════════════════
let supabaseClient = null;
try {
  supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON);
} catch(e) {
  console.warn('Supabase not configured — running in demo mode');
}

// ════════════════════════════════════
// APP STATE
// ════════════════════════════════════
const State = {
  user: null,
  sessionId: null,
  isLoading: false,
  sessions: [],
};

// ════════════════════════════════════
// MAIN INIT
// ════════════════════════════════════
async function initApp() {
  // 1. Run loading animation
  await SynapseAnimations.LoadingScreen.run();

  // 2. Show app shell
  const app = document.getElementById('app');
  app.classList.remove('hidden');
  app.classList.add('visible');

  // 3. Start particle background
  const canvas = document.getElementById('particle-canvas');
  const ps = new SynapseAnimations.ParticleSystem(canvas);
  ps.start();

  // 4. Setup input animation
  SynapseAnimations.setupInputAnimation();

  // 5. Check auth
  await checkAuth();

  // 6. Wire up UI events
  wireEvents();
}

// ════════════════════════════════════
// AUTH
// ════════════════════════════════════
async function checkAuth() {
  // Try Supabase session first
  if (supabaseClient) {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (session?.user) {
      setUser({
        id: session.user.id,
        name: session.user.user_metadata?.full_name || session.user.email,
        email: session.user.email,
        avatar: session.user.user_metadata?.avatar_url || null,
        token: session.access_token,
      });
      showMainInterface();
      return;
    }

    // Listen for auth state changes
    supabaseClient.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        setUser({
          id: session.user.id,
          name: session.user.user_metadata?.full_name || session.user.email,
          email: session.user.email,
          avatar: session.user.user_metadata?.avatar_url || null,
          token: session.access_token,
        });
        showMainInterface();
      } else if (event === 'SIGNED_OUT') {
        State.user = null;
        showLoginScreen();
      }
    });
  }

  showLoginScreen();
}

async function loginWithGoogle() {
  if (!supabaseClient) {
    loginAsGuest();
    return;
  }
  try {
    const { error } = await supabaseClient.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin }
    });
    if (error) throw error;
  } catch (e) {
    console.error('Google login error:', e);
    showToast('Login failed. Entering guest mode.', 'error');
    loginAsGuest();
  }
}

function loginAsGuest() {
  const guestId = 'guest_' + Math.random().toString(36).slice(2, 10);
  setUser({ id: guestId, name: 'Guest User', email: null, avatar: null, token: guestId });
  showMainInterface();
}

async function logout() {
  if (supabaseClient) await supabaseClient.auth.signOut();
  State.user = null;
  State.sessionId = null;
  State.sessions = [];
  ChatRenderer.clear();
  showLoginScreen();
}

function setUser(user) {
  State.user = user;
  localStorage.setItem('synapse_token', user.token || '');
  updateUserUI();
}

function updateUserUI() {
  const u = State.user;
  if (!u) return;

  document.getElementById('user-name').textContent = u.name || 'Guest';

  const avatar = document.getElementById('user-avatar');
  if (u.avatar) {
    avatar.innerHTML = `<img src="${u.avatar}" alt="avatar" onerror="this.parentElement.textContent='${(u.name||'G')[0].toUpperCase()}'"/>`;
  } else {
    avatar.textContent = (u.name || 'G')[0].toUpperCase();
  }
}

// ════════════════════════════════════
// SCREEN TRANSITIONS
// ════════════════════════════════════
function showLoginScreen() {
  document.getElementById('login-screen').classList.remove('hidden');
  document.getElementById('main-interface').classList.add('hidden');
}

function showMainInterface() {
  document.getElementById('login-screen').classList.add('hidden');
  document.getElementById('main-interface').classList.remove('hidden');
  startNewSession();
  loadUserSessions();
  loadAIStats();
}

// ════════════════════════════════════
// SESSION MANAGEMENT
// ════════════════════════════════════
function startNewSession() {
  State.sessionId = generateSessionId();
  document.getElementById('session-id').textContent = State.sessionId.slice(-8).toUpperCase();
  ChatRenderer.clear();
  document.querySelectorAll('.history-item').forEach(el => el.classList.remove('active'));
}

function generateSessionId() {
  return 'sess_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
}

async function loadUserSessions() {
  if (!State.user) return;
  try {
    const token = State.user.token || '';
    const res = await fetch(`${window.SYNAPSE_API}/chat/sessions?userId=${State.user.id}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) return;
    const data = await res.json();
    State.sessions = data.sessions || [];
    renderHistoryItems(State.sessions);
  } catch (e) {
    console.warn('Could not load sessions:', e.message);
  }
}

async function loadSession(sessionId) {
  if (!State.user) return;
  State.sessionId = sessionId;
  document.getElementById('session-id').textContent = sessionId.slice(-8).toUpperCase();
  ChatRenderer.clear();

  // Mark active
  document.querySelectorAll('.history-item').forEach(el => {
    el.classList.toggle('active', el.dataset.session === sessionId);
  });

  try {
    const token = State.user.token || '';
    const res = await fetch(`${window.SYNAPSE_API}/chat/history/${sessionId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) return;
    const data = await res.json();
    const msgs = data.messages || [];

    msgs.forEach(m => {
      if (m.role === 'user') {
        ChatRenderer.addUserMessage(m.message);
      } else {
        ChatRenderer.addAIMessage({
          text: m.message,
          timestamp: m.timestamp,
          memoryId: m.memoryId,
          similarity: m.similarity,
          isFromMemory: m.isFromMemory,
        });
      }
    });
  } catch (e) {
    console.warn('Could not load session history:', e.message);
  }
}

// ════════════════════════════════════
// AI STATS
// ════════════════════════════════════
async function loadAIStats() {
  try {
    const res = await fetch(`${window.SYNAPSE_API}/ai/stats`);
    if (!res.ok) return;
    const data = await res.json();
    document.getElementById('stat-memory').textContent = data.totalMemories ?? '—';
    document.getElementById('stat-accuracy').textContent = data.accuracy ? `${data.accuracy}%` : '—';
  } catch (e) {
    // Non-critical
  }
}

// ════════════════════════════════════
// CHAT SEND
// ════════════════════════════════════
async function sendMessage(text) {
  if (!text.trim() || State.isLoading) return;
  if (!State.user) { showToast('Please sign in to chat', 'error'); return; }

  State.isLoading = true;
  updateSendButton();

  // Add user message
  ChatRenderer.addUserMessage(text);
  clearInput();

  // Show thinking
  const thinkingEl = ChatRenderer.addThinkingMessage();
  showThinkingBar(true);

  try {
    const token = State.user.token || '';
    const res = await fetch(`${window.SYNAPSE_API}/ai/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        message: text,
        userId: State.user.id,
        sessionId: State.sessionId,
      })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Server error ${res.status}`);
    }

    const data = await res.json();

    // Remove thinking, add real message
    ChatRenderer.removeThinkingMessage();
    showThinkingBar(false);

    ChatRenderer.addAIMessage({
      text: data.answer,
      timestamp: data.timestamp || new Date().toISOString(),
      memoryId: data.memoryId,
      similarity: data.similarity,
      isFromMemory: data.isFromMemory,
    });

    // Refresh sessions and stats
    await loadUserSessions();
    await loadAIStats();

  } catch (e) {
    console.error('Chat error:', e);
    ChatRenderer.removeThinkingMessage();
    showThinkingBar(false);
    ChatRenderer.addAIMessage({
      text: `⚠️ Connection error: ${e.message}. Please check the backend is running.`,
      timestamp: new Date().toISOString(),
      memoryId: null,
    });
  } finally {
    State.isLoading = false;
    updateSendButton();
  }
}

function showThinkingBar(show) {
  const bar = document.getElementById('thinking-bar');
  if (bar) bar.classList.toggle('hidden', !show);
}

// ════════════════════════════════════
// INPUT MANAGEMENT
// ════════════════════════════════════
function clearInput() {
  const input = document.getElementById('chat-input');
  if (input) { input.value = ''; autoResizeInput(input); updateCharCount(); }
}

function autoResizeInput(el) {
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 180) + 'px';
}

function updateCharCount() {
  const input = document.getElementById('chat-input');
  const counter = document.getElementById('char-count');
  if (input && counter) counter.textContent = `${input.value.length}/2000`;
}

function updateSendButton() {
  const btn = document.getElementById('btn-send');
  const input = document.getElementById('chat-input');
  if (btn && input) {
    btn.disabled = !input.value.trim() || State.isLoading;
  }
}

// ════════════════════════════════════
// WIRE EVENTS
// ════════════════════════════════════
function wireEvents() {
  // Login
  document.getElementById('btn-google-login')?.addEventListener('click', loginWithGoogle);
  document.getElementById('btn-demo-login')?.addEventListener('click', loginAsGuest);
  document.getElementById('btn-logout')?.addEventListener('click', logout);

  // New chat
  document.getElementById('btn-new-chat')?.addEventListener('click', startNewSession);

  // Sidebar toggle
  document.getElementById('sidebar-toggle')?.addEventListener('click', () => {
    document.querySelector('.sidebar').classList.toggle('collapsed');
  });
  document.getElementById('mobile-sidebar-btn')?.addEventListener('click', () => {
    document.querySelector('.sidebar').classList.toggle('mobile-open');
  });

  // Input events
  const input = document.getElementById('chat-input');
  if (input) {
    input.addEventListener('input', () => {
      autoResizeInput(input);
      updateCharCount();
      updateSendButton();
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        const text = input.value.trim();
        if (text) sendMessage(text);
      }
    });
  }

  // Send button
  document.getElementById('btn-send')?.addEventListener('click', () => {
    const input = document.getElementById('chat-input');
    const text = input?.value.trim();
    if (text) sendMessage(text);
  });

  // Close mobile sidebar on backdrop click
  document.addEventListener('click', (e) => {
    const sidebar = document.querySelector('.sidebar');
    const mobileBtn = document.getElementById('mobile-sidebar-btn');
    if (window.innerWidth <= 768 &&
        sidebar?.classList.contains('mobile-open') &&
        !sidebar.contains(e.target) &&
        e.target !== mobileBtn) {
      sidebar.classList.remove('mobile-open');
    }
  });
}

// ════════════════════════════════════
// SUGGESTION CHIPS
// ════════════════════════════════════
function sendSuggestion(text) {
  const input = document.getElementById('chat-input');
  if (input) {
    input.value = text;
    autoResizeInput(input);
    updateCharCount();
    updateSendButton();
    input.focus();
    sendMessage(text);
  }
}

// ════════════════════════════════════
// EXPOSE GLOBALS
// ════════════════════════════════════
window.SynapseApp = {
  loadSession,
  sendMessage,
  sendSuggestion,
};
window.sendSuggestion = sendSuggestion;

// ════════════════════════════════════
// BOOT
// ════════════════════════════════════
document.addEventListener('DOMContentLoaded', initApp);
