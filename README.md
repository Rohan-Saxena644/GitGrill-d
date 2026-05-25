# CodeViva

AI-powered interview prep from your own GitHub code.

## What it does
Paste a public GitHub repository URL, tag the important files, choose focus areas, and get 10 multiple-choice interview questions built from your codebase. Each answer comes with feedback and a viva-ready explanation.

## Phase 1 features
- Google and GitHub auth for saved interviews
- Guest interview mode with 15-minute inactivity expiry
- 10-question MCQ-first interview flow
- More realistic prompt tuning for practical interview prep
- Post-question feedback plus personal notes
- Saved session history for signed-in users

## Tech Stack
- Next.js 14
- NextAuth.js v4
- MongoDB + Mongoose
- OpenRouter via the OpenAI SDK
- Tailwind CSS

## Setup

### 1. Install dependencies
```bash
npm install
```

### 2. Environment variables
Copy `.env.local.example` to `.env.local` and fill in:

```env
MONGODB_URL=your_mongodb_connection_string
NEXTAUTH_SECRET=any_random_string_at_least_32_chars
NEXTAUTH_URL=http://localhost:3000
GITHUB_CLIENT_ID=your_github_oauth_client_id
GITHUB_CLIENT_SECRET=your_github_oauth_client_secret
GOOGLE_CLIENT_ID=your_google_oauth_client_id
GOOGLE_CLIENT_SECRET=your_google_oauth_client_secret
OPENROUTER_API_KEY=your_openrouter_api_key
```

### 3. OAuth apps
For GitHub:
1. Go to `github.com/settings/developers`
2. Create a new OAuth app
3. Set the callback URL to `http://localhost:3000/api/auth/callback/github`

For Google:
1. Go to Google Cloud Console
2. Create OAuth client credentials
3. Set the callback URL to `http://localhost:3000/api/auth/callback/google`

### 4. Run the app
```bash
npm run dev
```

Visit `http://localhost:3000`

## How to use
1. Start as a guest or sign in with Google or GitHub
2. Paste a public GitHub repo URL
3. Tag the files you want the interview to focus on
4. Pick one or more focus areas
5. Generate 10 MCQ-based questions
6. Answer each question and review the explanation
7. Add your own viva notes
8. Review or revisit saved sessions from the dashboard
