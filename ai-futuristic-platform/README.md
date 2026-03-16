# SYNAPSE — Adaptive AI Platform

> A self-learning AI chatbot that evolves with every conversation. Built with Node.js, Supabase, and a futuristic glassmorphism UI.

![SYNAPSE](https://img.shields.io/badge/SYNAPSE-AI%20Platform-00f5ff?style=for-the-badge)
![Node](https://img.shields.io/badge/Node.js-18+-green?style=for-the-badge)
![Supabase](https://img.shields.io/badge/Supabase-Database-3ECF8E?style=for-the-badge)

---

## ✨ Features

- 🧠 **Memory-Based Learning** — AI stores and retrieves knowledge from a database
- 🔍 **Similarity Search** — Cosine + Jaccard + Fuse.js fuzzy matching
- 📊 **Feedback System** — User ratings improve answer quality over time
- 💬 **Chat History** — All sessions saved per user
- 🔐 **Google OAuth** — Secure authentication via Supabase Auth
- 🎨 **Futuristic UI** — AI laboratory aesthetic with animated neural elements
- 📱 **Responsive** — Works on desktop, tablet, and mobile

---

## 🏗️ Project Structure

```
/ai-futuristic-platform
├── frontend/
│   ├── index.html       # Main HTML shell
│   ├── style.css        # Futuristic UI styles
│   ├── app.js           # Auth, sessions, API calls
│   ├── chat.js          # Message rendering, feedback
│   └── animations.js    # Loading, particles, effects
├── backend/
│   ├── server.js        # Express API server
│   ├── aiEngine.js      # Similarity search + learning logic
│   └── database.js      # Supabase data access layer
├── config/
│   └── schema.sql       # Database setup SQL
├── .env.example         # Environment variable template
├── package.json
├── render.yaml          # Render deploy config
└── README.md
```

---

## 🚀 Quick Start (Local Development)

### Prerequisites
- Node.js 18+
- A Supabase account (free tier works)
- A Google Cloud project (for OAuth)

---

### Step 1: Clone the Repository

```bash
git clone https://github.com/YOUR_USERNAME/ai-futuristic-platform.git
cd ai-futuristic-platform
npm install
```

---

### Step 2: Set Up Supabase

1. Go to [supabase.com](https://supabase.com) → Create a new project
2. Go to **SQL Editor** → Paste and run the entire contents of `config/schema.sql`
3. Go to **Project Settings → API** and copy:
   - **Project URL** → `SUPABASE_URL`
   - **anon/public key** → for frontend
   - **service_role key** → for backend (keep secret!)

#### Enable Google OAuth in Supabase:
1. Go to **Authentication → Providers → Google**
2. Toggle **Enable Google**
3. You'll need a Google Cloud OAuth client ID & secret (see Step 3)

---

### Step 3: Set Up Google OAuth

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create a new project or select existing
3. Go to **APIs & Services → Credentials → Create Credentials → OAuth Client ID**
4. Application type: **Web application**
5. Add authorized redirect URIs:
   - `https://YOUR_PROJECT.supabase.co/auth/v1/callback`
   - `http://localhost:3001/api/auth/callback` (for local dev)
6. Copy the **Client ID** and **Client Secret** into Supabase Google provider settings

---

### Step 4: Configure Environment Variables

```bash
cp .env.example .env
```

Edit `.env`:
```env
SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...your_service_role_key

PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:5500
```

---

### Step 5: Configure Frontend

Edit `frontend/app.js` — update these lines:

```js
window.SYNAPSE_API = window.location.hostname === 'localhost'
  ? 'http://localhost:3001/api'
  : 'https://YOUR-RENDER-URL.onrender.com/api'; // ← your backend

const SUPABASE_URL = 'https://YOUR_PROJECT_ID.supabase.co';
const SUPABASE_ANON = 'your_anon_key_here';
```

---

### Step 6: Run Locally

```bash
# Terminal 1: Start backend
npm run dev

# Terminal 2: Serve frontend (use any static server)
npx serve frontend -p 5500
# OR open frontend/index.html directly in browser
```

Visit: `http://localhost:5500`

---

## ☁️ Deployment

### Frontend → GitHub Pages or Vercel (free)

#### Option A: GitHub Pages
1. Push your repo to GitHub
2. Go to **Settings → Pages → Source: main branch → /frontend folder**
3. Your site will be live at `https://USERNAME.github.io/REPO/`

#### Option B: Vercel (recommended)
1. Install Vercel CLI: `npm i -g vercel`
2. From the `frontend/` folder: `vercel deploy`
3. Follow prompts — your frontend URL will be something like `https://synapse-xyz.vercel.app`

---

### Backend → Render (free)

1. Push code to GitHub
2. Go to [render.com](https://render.com) → **New → Web Service**
3. Connect your GitHub repo
4. Settings:
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Environment:** Node
5. Add Environment Variables (in Render dashboard):
   ```
   SUPABASE_URL          = https://your_project.supabase.co
   SUPABASE_SERVICE_ROLE_KEY = eyJhbGci...
   FRONTEND_URL          = https://your-vercel-url.vercel.app
   NODE_ENV              = production
   PORT                  = 3001
   ```
6. Deploy! Your backend URL will be `https://synapse-backend.onrender.com`

> ⚠️ Free Render services spin down after 15 minutes of inactivity. First request may take ~30s to wake up.

---

### Final Configuration After Deployment

1. Update `frontend/app.js`:
   ```js
   window.SYNAPSE_API = 'https://YOUR-RENDER-APP.onrender.com/api';
   ```

2. Update CORS in backend `server.js`:
   ```js
   origin: 'https://your-vercel-url.vercel.app'
   ```

3. Add your Vercel URL to Supabase **Authentication → URL Configuration → Site URL**

---

## 🧠 How the AI Learning System Works

### Memory Flow

```
User Query
    │
    ▼
Extract Keywords
    │
    ▼
Search ai_memory table
    ├─── Fuse.js fuzzy search
    ├─── Cosine similarity (keyword vectors)
    └─── Jaccard similarity (keyword overlap)
    │
    ▼
Combined Similarity Score
    │
    ├── Score ≥ 0.38 → Return stored answer (memory match)
    └── Score < 0.38 → Generate default/generic response
    │
    ▼
Store new Q&A in ai_memory
Store message in chat_history
    │
    ▼
User gives feedback (👍/👎)
    │
    ▼
Update memory score (+1 or -1)
```

### Similarity Scoring

| Method | Weight | Description |
|--------|--------|-------------|
| Cosine Similarity | 30% | Keyword frequency vectors |
| Jaccard Similarity | 20% | Keyword set overlap |
| Fuse.js Fuzzy | 40% | String-based fuzzy matching |
| Score Boost | 10% | Prior feedback rating |

---

## 📊 Database Schema

### `ai_memory` table
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| question | TEXT | Stored question |
| answer | TEXT | Stored answer |
| score | INTEGER | Feedback score (positive = good) |
| created_at | TIMESTAMPTZ | Creation timestamp |

### `chat_history` table
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| session_id | TEXT | Chat session identifier |
| user_id | TEXT | User ID |
| message | TEXT | Message content |
| role | TEXT | 'user' or 'ai' |
| memory_id | UUID | Reference to ai_memory |
| similarity | NUMERIC | Match confidence (0-1) |
| is_from_memory | BOOLEAN | Whether answer came from memory |
| timestamp | TIMESTAMPTZ | Message timestamp |

---

## 🛠️ API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Health check |
| POST | `/api/ai/chat` | Send message, get AI response |
| POST | `/api/ai/feedback` | Rate an AI response |
| GET | `/api/ai/stats` | Memory bank statistics |
| GET | `/api/chat/sessions?userId=` | Get user's chat sessions |
| GET | `/api/chat/history/:sessionId` | Get messages in a session |
| GET | `/api/memory` | View all memories (debug) |

---

## 🎨 UI Design System

| Token | Value | Usage |
|-------|-------|-------|
| `--cyan` | `#00f5ff` | Primary accent, active states |
| `--violet` | `#7b2fff` | Secondary accent |
| `--magenta` | `#ff2d78` | Warning, error states |
| `--bg-deep` | `#040810` | Page background |
| `--font-display` | Orbitron | Headings, labels |
| `--font-mono` | Share Tech Mono | Stats, metadata |
| `--font-body` | Inter | Message content |

---

## 📄 License

MIT License — free to use, modify, and deploy.

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Commit changes: `git commit -m 'Add my feature'`
4. Push to branch: `git push origin feature/my-feature`
5. Open a Pull Request

---

*Built with ⚡ by the SYNAPSE team*
