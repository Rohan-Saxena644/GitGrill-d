/**
 * AI helpers — powered by OpenRouter (free tier, no credit card needed).
 * Uses the OpenAI-compatible SDK since OpenRouter supports that interface.
 * Add OPENROUTER_API_KEY to your .env and Vercel environment variables.
 */

import OpenAI from 'openai';
import { TaggedFile, FocusArea, Question } from '@/types';

// openrouter/free auto-selects from all currently available free models —
// it never returns a 404 even if individual models get removed.
const MODEL = 'meta-llama/llama-3.3-70b-instruct:free';

// Lazy client initialization — only created when a function is called,
// not at module load time. This prevents Vercel build crashes when the
// env var isn't available during the build phase.
function getClient() {
    return new OpenAI({
        baseURL: 'https://openrouter.ai/api/v1',
        apiKey: process.env.OPENROUTER_API_KEY!,
    });
}

/**
 * Generates interview questions from tagged code files.
 * Returns an array of Question objects.
 */
export async function generateQuestions(
    taggedFiles: TaggedFile[],
    focusAreas: FocusArea[],
    repoName: string
): Promise<Question[]> {
    const client = getClient();

    const fileContext = taggedFiles
        .filter((f) => f.content)
        .map((f) => `### File: ${f.path} (tagged as: ${f.tag})\n\`\`\`\n${f.content}\n\`\`\``)
        .join('\n\n');

    const prompt = `You are a senior software engineer conducting a technical interview.
The candidate has shared their GitHub project "${repoName}".
Study the code below and generate exactly 6 interview questions.

Focus areas the candidate selected: ${focusAreas.join(', ')}

Code files:
${fileContext}

Rules:
- Ask about SPECIFIC code decisions you see (not generic questions)
- Reference actual function names, variable names, or patterns from the code
- Mix difficulty: 2 Easy, 2 Medium, 2 Hard
- Each question must target one of the selected focus areas

Respond ONLY with valid JSON (no markdown, no explanation), in this exact format:
[
  {
    "text": "question text here",
    "category": "Architecture",
    "difficulty": "Medium"
  }
]`;

    const response = await client.chat.completions.create({
        model: MODEL,
        messages: [{ role: 'user', content: prompt }],
    });

    const text = response.choices[0]?.message?.content ?? '';
    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    try {
        const questions = JSON.parse(cleaned) as Question[];
        if (!Array.isArray(questions) || questions.length === 0) {
            throw new Error('Model returned an empty or invalid questions array');
        }
        return questions;
    } catch {
        console.error('Failed to parse response as JSON:', cleaned);
        throw new Error('Model returned malformed JSON. Raw: ' + cleaned.slice(0, 200));
    }
}

/**
 * Evaluates a user's answer to an interview question.
 * Returns a score (1-10), feedback, and a model answer.
 */
export async function evaluateAnswer(
    question: string,
    userAnswer: string,
    fileContext: string
): Promise<{ score: number; feedback: string; aiAnswer: string }> {
    const client = getClient();

    const prompt = `You are a senior software engineer evaluating an interview answer.

Question: ${question}

Relevant code context:
\`\`\`
${fileContext.slice(0, 3000)}
\`\`\`

Candidate's answer: ${userAnswer}

Evaluate the answer. Be fair but honest.

Respond ONLY with valid JSON (no markdown, no explanation):
{
  "score": <number from 1 to 10>,
  "feedback": "<2-3 sentence feedback on what was good/missing>",
  "aiAnswer": "<a strong 3-5 sentence model answer for this question>"
}`;

    const response = await client.chat.completions.create({
        model: MODEL,
        messages: [{ role: 'user', content: prompt }],
    });

    const text = response.choices[0]?.message?.content ?? '';
    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    try {
        const result = JSON.parse(cleaned);
        if (typeof result.score !== 'number' || !result.feedback || !result.aiAnswer) {
            throw new Error('Model returned incomplete evaluation fields');
        }
        return result;
    } catch {
        console.error('Failed to parse evaluation response:', cleaned);
        throw new Error('Model returned malformed JSON. Raw: ' + cleaned.slice(0, 200));
    }
}