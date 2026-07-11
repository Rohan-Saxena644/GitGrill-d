# GitGrill'd

**AI-powered technical interview prep from your own GitHub code.**

GitGrill'd analyzes your GitHub repository, reads the files you select, and generates a tailored set of MCQs and open-ended interview questions with direct Gemini inference. No generic LeetCode grind: questions are grounded in code you actually wrote.

**Live demo -> [gitgrilld.vercel.app](https://gitgrilld.vercel.app)**

---

## What it does

Paste a GitHub repo URL, tag your files by type (core logic, boilerplate, config, tests), pick your focus areas, and get a 12-question interview with explanations and review support.

Two interview tracks:

- **Repo Viva** - questions generated from your tagged project files.
- **Systems Design** - scenario-based questions on message queues, caching, search indexing, data consistency, and more.

---

## Tech stack

### Frontend - Next.js 14 (App Router)
- NextAuth with Google and GitHub OAuth
- Guest mode with 15-minute session storage
- Multi-step interview setup with file tagging UI
- Full-screen animated loading overlay during generation

### Direct AI inference
- Gemini through Google's OpenAI-compatible endpoint
- Structured JSON schemas for question generation and answer evaluation
- Local parsing, validation, sanitization, and one retry for malformed generation output
- Deterministic MCQ answer evaluation in application code

### Database
- MongoDB via Mongoose for saved sessions and user accounts

### Deployment
- Next.js -> Vercel
- MongoDB -> your MongoDB provider
- Gemini API key configured in Vercel or `.env.local`

---

## Architecture

```text
User browser
     |
     v
Next.js
  /api/repo/files     -> fetches file tree from GitHub API
  /api/ai/generate    -> fetches selected file contents when needed
     |
     v
src/lib/gemini.ts
  build prompt
  call Gemini once via client.chat.completions.create(...)
  parse and validate structured JSON
     |
     v
return questions and optionally save them to MongoDB
```

Answer evaluation:

```text
/api/ai/evaluate
  MCQ answers        -> deterministic local comparison
  short/descriptive  -> one structured Gemini request
```

---

## Running locally

### Prerequisites
- Node.js 18+
- MongoDB URI
- Gemini API key from [Google AI Studio](https://aistudio.google.com/apikey)
- Google/GitHub OAuth credentials for NextAuth

### 1. Clone

```bash
git clone https://github.com/Rohan-Saxena644/GitGrill-d
cd gitgrilld
```

### 2. Install

```bash
npm install
```

### 3. Configure environment

Create `.env.local`:

```env
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_secret_here

GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...

MONGODB_URI=mongodb+srv://...

GEMINI_API_KEY=...
```

### 4. Run

```bash
npm run dev
```

---

## Key engineering decisions

**Why direct Gemini inference?**
The generation workflow is deterministic and known in advance: fetch selected files, build context, call the model, parse structured output, validate it, and return questions. Keeping this in the main Next.js app makes the production path easier to understand and maintain.

**Why use the OpenAI client?**
Google's Gemini API exposes an OpenAI-compatible endpoint, so the app can use the `openai` package while still calling Gemini directly.

**Why structured JSON schemas?**
Question generation and answer evaluation need predictable shapes. Schema-constrained responses reduce malformed JSON, and the app still validates and sanitizes model output before using it.

---

## License

MIT
