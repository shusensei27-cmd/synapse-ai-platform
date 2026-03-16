/* animations.js — SYNAPSE Futuristic AI Platform */

// ════════════════════════════════════
// PARTICLE CANVAS BACKGROUND
// ════════════════════════════════════
class ParticleSystem {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.particles = [];
    this.connections = [];
    this.mouse = { x: -9999, y: -9999 };
    this.animFrame = null;
    this.resize();
    this.init();
    window.addEventListener('resize', () => this.resize());
    window.addEventListener('mousemove', (e) => {
      this.mouse.x = e.clientX;
      this.mouse.y = e.clientY;
    });
  }

  resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  init() {
    this.particles = [];
    const count = Math.floor((window.innerWidth * window.innerHeight) / 18000);
    for (let i = 0; i < count; i++) {
      this.particles.push(this.createParticle());
    }
  }

  createParticle() {
    return {
      x: Math.random() * this.canvas.width,
      y: Math.random() * this.canvas.height,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      size: Math.random() * 1.5 + 0.5,
      opacity: Math.random() * 0.5 + 0.1,
      hue: Math.random() > 0.5 ? '0, 245, 255' : '123, 47, 255',
      pulse: Math.random() * Math.PI * 2,
      pulseSpeed: Math.random() * 0.02 + 0.005,
    };
  }

  draw() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    this.particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.pulse += p.pulseSpeed;

      if (p.x < 0) p.x = this.canvas.width;
      if (p.x > this.canvas.width) p.x = 0;
      if (p.y < 0) p.y = this.canvas.height;
      if (p.y > this.canvas.height) p.y = 0;

      const pulseFactor = 0.5 + Math.sin(p.pulse) * 0.5;
      const alpha = p.opacity * pulseFactor;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${p.hue}, ${alpha})`;
      ctx.fill();
    });

    // Draw connections
    const maxDist = 120;
    for (let i = 0; i < this.particles.length; i++) {
      for (let j = i + 1; j < this.particles.length; j++) {
        const a = this.particles[i], b = this.particles[j];
        const dx = a.x - b.x, dy = a.y - b.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < maxDist) {
          const alpha = (1 - dist / maxDist) * 0.12;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.strokeStyle = `rgba(0, 245, 255, ${alpha})`;
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      }
    }

    this.animFrame = requestAnimationFrame(() => this.draw());
  }

  start() { this.draw(); }
  stop() { if (this.animFrame) cancelAnimationFrame(this.animFrame); }
}

// ════════════════════════════════════
// LOADING SCREEN CONTROLLER
// ════════════════════════════════════
const LoadingScreen = (() => {
  const messages = [
    'INITIALIZING NEURAL CORE...',
    'LOADING MEMORY BANKS...',
    'SYNCING DATABASE...',
    'CALIBRATING SIMILARITY ENGINE...',
    'ESTABLISHING SECURE CHANNEL...',
    'READY.'
  ];

  async function run() {
    const screen = document.getElementById('loading-screen');
    const status = document.getElementById('loader-status');
    const progress = document.getElementById('loader-progress');

    for (let i = 0; i < messages.length; i++) {
      status.textContent = messages[i];
      const pct = ((i + 1) / messages.length) * 100;
      progress.style.width = pct + '%';
      await sleep(i === messages.length - 1 ? 300 : 500 + Math.random() * 300);
    }

    await sleep(400);
    screen.classList.add('fade-out');
    await sleep(800);
    screen.style.display = 'none';
  }

  function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

  return { run };
})();

// ════════════════════════════════════
// GLOW BORDER ANIMATION ON CARDS
// ════════════════════════════════════
function animateGlowBorders() {
  const panels = document.querySelectorAll('.glass-panel, .glass-panel-sm');
  panels.forEach(panel => {
    panel.style.setProperty('--glow-angle', '0deg');
  });
}

// ════════════════════════════════════
// TYPING CURSOR ANIMATION
// ════════════════════════════════════
function createTypingCursor() {
  const cursor = document.createElement('span');
  cursor.className = 'typing-cursor';
  cursor.innerHTML = '▌';
  cursor.style.cssText = `
    display: inline-block;
    animation: cursor-blink 0.7s ease-in-out infinite;
    color: var(--cyan);
    margin-left: 2px;
  `;
  const style = document.createElement('style');
  style.textContent = `
    @keyframes cursor-blink {
      0%, 49% { opacity: 1; }
      50%, 100% { opacity: 0; }
    }
  `;
  document.head.appendChild(style);
  return cursor;
}

// ════════════════════════════════════
// TYPEWRITER EFFECT
// ════════════════════════════════════
async function typewriterEffect(element, text, speed = 18) {
  element.textContent = '';
  const cursor = createTypingCursor();
  element.appendChild(cursor);

  let i = 0;
  return new Promise(resolve => {
    const interval = setInterval(() => {
      if (i < text.length) {
        element.insertBefore(document.createTextNode(text[i]), cursor);
        i++;
      } else {
        clearInterval(interval);
        cursor.remove();
        resolve();
      }
    }, speed);
  });
}

// ════════════════════════════════════
// SMOOTH AUTO-SCROLL
// ════════════════════════════════════
function smoothScrollToBottom(container) {
  container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
}

// ════════════════════════════════════
// MESSAGE APPEAR ANIMATION
// ════════════════════════════════════
function animateMessageIn(el) {
  el.style.opacity = '0';
  el.style.transform = 'translateY(12px)';
  requestAnimationFrame(() => {
    el.style.transition = 'opacity 0.3s ease, transform 0.3s cubic-bezier(0.3,0,0,1)';
    el.style.opacity = '1';
    el.style.transform = 'translateY(0)';
  });
}

// ════════════════════════════════════
// INPUT FOCUS ANIMATION
// ════════════════════════════════════
function setupInputAnimation() {
  const input = document.getElementById('chat-input');
  const wrapper = document.getElementById('input-wrapper');

  if (!input || !wrapper) return;

  input.addEventListener('focus', () => wrapper.classList.add('focused'));
  input.addEventListener('blur', () => wrapper.classList.remove('focused'));
}

// ════════════════════════════════════
// EXPORT UTILITIES
// ════════════════════════════════════
window.SynapseAnimations = {
  ParticleSystem,
  LoadingScreen,
  typewriterEffect,
  smoothScrollToBottom,
  animateMessageIn,
  setupInputAnimation,
  createTypingCursor,
};
