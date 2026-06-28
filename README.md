# GitGrill'd 🔥

**AI-powered technical interview prep from your own GitHub code.**

GitGrill'd analyses your GitHub repository, reads your actual files, and generates a tailored set of MCQs and descriptive interview questions using a LangGraph agent pipeline backed by Groq's llama-3.3-70b. No generic LeetCode grind — questions are grounded in code you actually wrote.

**Live demo → [gitgrilld.vercel.app](https://gitgrilld.vercel.app)**

---

## What it does

Paste a GitHub repo URL, tag your files by type (core logic, boilerplate, config, tests), pick your focus areas, and get a 12-question interview in under 10 seconds — MCQs with explanations and open-ended descriptive questions, all based on your actual codebase.

Two interview tracks:

- **Repo Viva** — questions generated from your tagged project files using TF-IDF retrieval to surface the most relevant code chunks
- **Systems Design** — scenario-based questions on message queues, caching, search indexing, data consistency, and more

---

## Tech stack

### Frontend — Next.js 14 (App Router)
- Next-Auth with Google and GitHub OAuth
- Guest mode with 15-minute session storage (no login required)
- Multi-step interview setup with file tagging UI
- Full-screen animated loading overlay with cold-start detection and auto-retry

### AI Service — Python / FastAPI (deployed on Render)
- **LangGraph** agent with build → generate → validate → retry loop
- **Groq** (llama-3.3-70b-versatile) as primary LLM — ~2s response time, 14,400 RPD free
- **Gemini 2.0 Flash** as automatic fallback if Groq quota is exhausted
- **TF-IDF retrieval** (pure Python stdlib) replaces vector databases — cosine similarity over chunked file content, zero native dependencies
- In-memory response cache keyed on repo + focus areas to avoid duplicate API calls

### Database
- MongoDB via Mongoose for saved sessions and user accounts

### Deployment
- Next.js → Vercel
- Python service → Render (free tier, Python 3.11.9)
- Automatic cold-start resilience: frontend detects 503, shows countdown UI, auto-retries

---

## Architecture

```
User browser
     │
     ▼
Next.js (Vercel)
  /api/repo/files     → fetches file tree from GitHub API
  /api/ai/generate    → calls Python service, falls back to Gemini direct
     │
     ▼
Python FastAPI (Render)
  POST /generate
     │
     ├── build_context()     TF-IDF index over tagged files
     ├── generate()          Groq LLM call with structured prompt
     └── validate()          checks MCQ count, option counts, retries once
```

---

## Running locally

### Prerequisites
- Node.js 18+
- Python 3.11+
- MongoDB URI
- Groq API key (free at [console.groq.com](https://console.groq.com))
- Google/GitHub OAuth credentials for Next-Auth

### 1. Clone

```bash
git clone https://github.com/Rohan-Saxena644/GitGrill-d
cd gitgrilld
```

### 2. Frontend

```bash
npm install
```

Create `.env.local`:

```env
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_secret_here

GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...

MONGODB_URI=mongodb+srv://...

PYTHON_SERVICE_URL=http://localhost:8000
NEXT_PUBLIC_PYTHON_SERVICE_URL=http://localhost:8000

GEMINI_API_KEY=...        # fallback if Python service is down
```

```bash
npm run dev
```

### 3. Python service

```bash
cd python-service
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
```

Create `.env`:

```env
GROQ_API_KEY=...
GEMINI_API_KEY=...
```

```bash
uvicorn main:app --reload --port 8000
```

---

## Key engineering decisions

**Why TF-IDF instead of a vector database?**
chromadb and sentence-transformers pull in PyTorch and CUDA libraries — over 2 GB of dependencies that immediately OOM-crash on Render's 512 MB free tier. TF-IDF cosine similarity over code chunks uses only Python stdlib (`math`, `re`, `collections`) and stays well under 150 MB total. For keyword-heavy code retrieval it performs comparably.

**Why Groq over Gemini as primary?**
Groq runs on custom LPU inference chips and returns responses in 1–3 seconds vs 8–12 seconds for Gemini free tier. Both are free. Gemini stays as an automatic fallback on quota exhaustion.

**Why LangGraph for a single-agent flow?**
The generate → validate → retry loop maps cleanly onto a state graph. If the first generation returns malformed JSON or too few MCQs, the graph retries once automatically before surfacing an error. Adding more nodes (e.g. a planning step, difficulty calibration) is straightforward.

---

## Deployment notes

The Python service is on Render's free tier which spins down after 15 minutes of inactivity. The Next.js app fires a silent `/health` request to the Python service as soon as the homepage loads, so by the time a user reaches the generate step the backend is usually already warm.

If the service is still cold when generation is triggered, the frontend catches the 503, shows an animated countdown overlay, and auto-retries — no user action needed.

---

## License

MIT
