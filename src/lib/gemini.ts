import { GoogleGenerativeAI } from '@google/generative-ai';
import { TaggedFile, FocusArea, Question, Difficulty } from '@/types';

// Initialize Gemini client with the API key from env
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

// We use gemini-1.5-flash — fast and cost-effective for this use case
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

/**
 * Generates interview questions from tagged code files.
 * Returns an array of Question objects.
 */
export async function generateQuestions(
    taggedFiles: TaggedFile[],
    focusAreas: FocusArea[],
    repoName: string
): Promise<Question[]> {
    // Build the file context block for the prompt
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

    const result = await model.generateContent(prompt);
    const response = result.response.text();

    // Parse the JSON array from the response
    const cleaned = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const questions = JSON.parse(cleaned) as Question[];
    return questions;
}

/**
 * Evaluates a user's answer to an interview question.
 * Returns a score (1-10), feedback, and sample answer.
 */
export async function evaluateAnswer(
    question: string,
    userAnswer: string,
    fileContext: string
): Promise<{ score: number; feedback: string; aiAnswer: string }> {
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

    const result = await model.generateContent(prompt);
    const response = result.response.text();

    const cleaned = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(cleaned);
}
