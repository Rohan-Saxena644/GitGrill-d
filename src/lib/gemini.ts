import { GoogleGenAI } from '@google/genai';
import { TaggedFile, FocusArea, Question } from '@/types';

// Initialize Gemini using the API key from environment variables
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

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

    const response = await ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: prompt,
    });

    const text = response.text ?? '';
    // Strip any markdown code fences the model might add
    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    try {
        const questions = JSON.parse(cleaned) as Question[];
        if (!Array.isArray(questions) || questions.length === 0) {
            throw new Error('Gemini returned an empty or invalid questions array');
        }
        return questions;
    } catch {
        console.error('Failed to parse Gemini response as JSON:', cleaned);
        throw new Error('Gemini returned malformed JSON. Raw response: ' + cleaned.slice(0, 200));
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

    const response = await ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: prompt,
    });

    const text = response.text ?? '';
    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    try {
        const result = JSON.parse(cleaned);
        if (typeof result.score !== 'number' || !result.feedback || !result.aiAnswer) {
            throw new Error('Gemini returned incomplete evaluation fields');
        }
        return result;
    } catch {
        console.error('Failed to parse Gemini evaluation response:', cleaned);
        throw new Error('Gemini returned malformed JSON. Raw response: ' + cleaned.slice(0, 200));
    }
}