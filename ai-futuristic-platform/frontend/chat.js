/* chat.js — SYNAPSE Message System */

// ════════════════════════════════════
// MARKDOWN PARSER (lightweight)
// ════════════════════════════════════
function parseMarkdown(text) {
  if (!text) return '';

  let html = text
    // Escape HTML
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    // Code blocks (triple backtick)
    .replace(/```(\w*)\n?([\s\S]*?)```/g, (_, lang, code) =>
      `<pre><code class="lang-${lang || 'text'}">${code.trim()}</code></pre>`)
    // Inline code
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    // Bold
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    // Italic
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    // Headers
    .replace(/^### (.+)$/gm, '<h4 style="color:var(--cyan);font-family:var(--font-display);font-size:0.85rem;margin:8px 0 4px;letter-spacing:0.05em;">$1</h4>')
    .replace(/^## (.+)$/gm, '<h3 style="color:var(--cyan);font-family:var(--font-display);font-size:0.95rem;margin:10px 0 4px;letter-spacing:0.05em;">$1</h3>')
    .replace(/^# (.+)$/gm, '<h2 style="color:var(--cyan);font-family:var(--font-display);font-size:1rem;margin:10px 0 4px;letter-spacing:0.08em;">$1</h2>')
    // Bullet lists
    .replace(/^[-*] (.+)$/gm, '<li style="margin:3px 0;padding-left:4px;">$1</li>')
    // Numbered lists
    .replace(/^\d+\. (.+)$/gm, '<li style="margin:3px 0;list-style-type:decimal;margin-left:16px;">$1</li>')
    // Line breaks
    .replace(/\n\n/g, '</p><p style="margin:8px 0;">')
    .replace(/\n/g, '<br>');

  // Wrap li in ul
  html = html.replace(/((<li[^>]*>.*?<\/li>\s*)+)/g, '<ul style="margin:8px 0;padding-left:20px;">$1</ul>');

  return `<p style="margin:0;">${html}</p>`;
}

// ════════════════════════════════════
// TIME FORMATTER
// ════════════════════════════════════
function formatTime(dateStr) {
  const d = new Date(dateStr || Date.now());
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// ════════════════════════════════════
// CHAT RENDERER
// ════════════════════════════════════
const ChatRenderer = {
  list: document.getElementById('messages-list'),
  welcome: document.getElementById('welcome-state'),
  container: document.getElementById('messages-container'),

  showWelcome(show) {
    if (!this.welcome) return;
    this.welcome.style.display = show ? 'flex' : 'none';
  },

  addUserMessage(text) {
    this.showWelcome(false);
    const el = this._createMessage('user', {
      text,
      timestamp: new Date().toISOString(),
    });
    this.list.appendChild(el);
    SynapseAnimations.animateMessageIn(el);
    this._scrollToBottom();
    return el;
  },

  addAIMessage(data) {
    // data: { text, timestamp, memoryId, similarity, isFromMemory }
    this.showWelcome(false);
    const el = this._createMessage('ai', data);
    this.list.appendChild(el);
    SynapseAnimations.animateMessageIn(el);
    this._scrollToBottom();
    return el;
  },

  _createMessage(role, data) {
    const wrapper = document.createElement('div');
    wrapper.className = `message ${role}`;
    wrapper.dataset.memoryId = data.memoryId || '';

    const avatarSvg = role === 'ai'
      ? `<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="var(--cyan)" stroke-width="1.5"/><circle cx="12" cy="12" r="4" fill="var(--cyan)" opacity="0.6"/></svg>`
      : `<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="8" r="4" stroke="white" stroke-width="1.5"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke="white" stroke-width="1.5" stroke-linecap="round"/></svg>`;

    const matchBadge = (role === 'ai' && data.isFromMemory)
      ? `<div class="match-badge">⚡ MEMORY MATCH · ${Math.round((data.similarity || 0) * 100)}% CONFIDENCE</div>`
      : '';

    const feedbackRow = role === 'ai' && data.memoryId
      ? `<div class="feedback-row">
           <button class="btn-feedback correct" onclick="ChatFeedback.rate('${data.memoryId}', 1, this)">
             <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
             Correct
           </button>
           <button class="btn-feedback incorrect" onclick="ChatFeedback.rate('${data.memoryId}', -1, this)">
             <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
             Incorrect
           </button>
         </div>`
      : '';

    const confidenceLabel = role === 'ai' && data.similarity != null
      ? `<span class="msg-confidence">SIM: ${Math.round(data.similarity * 100)}%</span>`
      : '';

    wrapper.innerHTML = `
      <div class="msg-avatar">${avatarSvg}</div>
      <div class="msg-content">
        ${matchBadge}
        <div class="msg-bubble">${role === 'ai' ? parseMarkdown(data.text) : escapeHtml(data.text)}</div>
        <div class="msg-meta">
          <span class="msg-time">${formatTime(data.timestamp)}</span>
          ${confidenceLabel}
        </div>
        ${feedbackRow}
      </div>
    `;
    return wrapper;
  },

  addThinkingMessage() {
    this.showWelcome(false);
    const el = document.createElement('div');
    el.className = 'message ai thinking-msg';
    el.id = 'thinking-msg-tmp';
    el.innerHTML = `
      <div class="msg-avatar">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="var(--cyan)" stroke-width="1.5"/>
          <circle cx="12" cy="12" r="4" fill="var(--cyan)" opacity="0.6"/>
        </svg>
      </div>
      <div class="msg-content">
        <div class="msg-bubble" style="display:flex;align-items:center;gap:10px;min-height:40px;">
          <div class="thinking-dots">
            <span></span><span></span><span></span>
          </div>
          <span style="font-size:0.78rem;color:var(--text-muted);font-family:var(--font-mono)">Processing...</span>
        </div>
      </div>
    `;
    this.list.appendChild(el);
    this._scrollToBottom();
    return el;
  },

  removeThinkingMessage() {
    const el = document.getElementById('thinking-msg-tmp');
    if (el) el.remove();
  },

  _scrollToBottom() {
    SynapseAnimations.smoothScrollToBottom(this.container);
  },

  clear() {
    this.list.innerHTML = '';
    this.showWelcome(true);
  }
};

// ════════════════════════════════════
// FEEDBACK SYSTEM
// ════════════════════════════════════
const ChatFeedback = {
  async rate(memoryId, score, btn) {
    if (!memoryId) return;
    // Disable both buttons in the row
    const row = btn.closest('.feedback-row');
    row.querySelectorAll('.btn-feedback').forEach(b => b.disabled = true);
    const label = document.createElement('span');
    label.className = 'feedback-applied';
    label.textContent = score > 0 ? '✓ Marked correct' : '✗ Marked incorrect';
    row.appendChild(label);

    try {
      const token = localStorage.getItem('synapse_token') || '';
      const res = await fetch(`${window.SYNAPSE_API}/ai/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ memoryId, score })
      });
      if (!res.ok) throw new Error('Feedback failed');
      showToast(score > 0 ? 'SYNAPSE learned from your feedback ✓' : 'Response flagged for improvement', score > 0 ? 'success' : 'error');
    } catch (e) {
      console.error('Feedback error:', e);
    }
  }
};

// ════════════════════════════════════
// HISTORY SIDEBAR ITEMS
// ════════════════════════════════════
function renderHistoryItems(sessions) {
  const list = document.getElementById('chat-history-list');
  if (!list) return;
  if (!sessions || sessions.length === 0) {
    list.innerHTML = '<div class="history-empty">No sessions yet</div>';
    return;
  }
  list.innerHTML = sessions.map(s => `
    <div class="history-item" data-session="${s.sessionId}" onclick="SynapseApp.loadSession('${s.sessionId}')">
      <div class="history-item-icon"></div>
      <span class="history-item-label">${escapeHtml(s.preview || 'Chat session')}</span>
      <span class="history-item-time">${formatRelativeTime(s.timestamp)}</span>
    </div>
  `).join('');
}

function formatRelativeTime(ts) {
  if (!ts) return '';
  const diff = Date.now() - new Date(ts).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'now';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

// ════════════════════════════════════
// TOAST SYSTEM
// ════════════════════════════════════
function showToast(msg, type = '') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = msg;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(20px)';
    toast.style.transition = '0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// ════════════════════════════════════
// ESCAPE HTML
// ════════════════════════════════════
function escapeHtml(text) {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ════════════════════════════════════
// THINKING DOTS CSS (inject once)
// ════════════════════════════════════
(function injectThinkingDots() {
  const style = document.createElement('style');
  style.textContent = `
    .thinking-dots { display: flex; gap: 5px; align-items: center; }
    .thinking-dots span {
      width: 6px; height: 6px; border-radius: 50%;
      background: var(--cyan); display: block;
      animation: dot-bounce 1.2s ease-in-out infinite;
    }
    .thinking-dots span:nth-child(2) { animation-delay: 0.2s; background: var(--violet); }
    .thinking-dots span:nth-child(3) { animation-delay: 0.4s; background: var(--magenta); }
    @keyframes dot-bounce {
      0%,80%,100% { transform: scale(0.8); opacity: 0.5; }
      40% { transform: scale(1.3); opacity: 1; }
    }
  `;
  document.head.appendChild(style);
})();

// Expose globally
window.ChatRenderer = ChatRenderer;
window.ChatFeedback = ChatFeedback;
window.renderHistoryItems = renderHistoryItems;
window.showToast = showToast;
window.escapeHtml = escapeHtml;
