import OpenAI from 'openai';
import { FocusArea, Question, TaggedFile } from '@/types';

const MODEL = 'openrouter/auto';

function getClient() {
    return new OpenAI({
        baseURL: 'https://openrouter.ai/api/v1',
        apiKey: process.env.OPENROUTER_API_KEY!,
        defaultHeaders: {
            'HTTP-Referer': process.env.NEXTAUTH_URL ?? 'http://localhost:3000',
            'X-Title': 'CodeViva',
        },
    });
}

function sanitizeQuestion(question: Question, index: number): Question {
    const options = Array.isArray(question.options)
        ? question.options.filter((option) => typeof option === 'string' && option.trim()).slice(0, 4)
        : [];

    if (options.length !== 4) {
        throw new Error(`Question ${index + 1} did not include exactly 4 valid options`);
    }

    if (
        typeof question.correctAnswerIndex !== 'number' ||
        question.correctAnswerIndex < 0 ||
        question.correctAnswerIndex > 3
    ) {
        throw new Error(`Question ${index + 1} returned an invalid correctAnswerIndex`);
    }

    return {
        text: question.text?.trim(),
        category: question.category,
        difficulty: question.difficulty,
        options,
        correctAnswerIndex: question.correctAnswerIndex,
        explanation: question.explanation?.trim(),
    };
}

/**
 * Generates 10 interview-practice MCQs from tagged code files.
 */
export async function generateQuestions(
    taggedFiles: TaggedFile[],
    focusAreas: FocusArea[],
    repoName: string
): Promise<Question[]> {
    const client = getClient();

    const fileContext = taggedFiles
        .filter((file) => file.content)
        .map((file) => `### File: ${file.path} (tagged as: ${file.tag})\n\`\`\`\n${file.content}\n\`\`\``)
        .join('\n\n');

    const prompt = `You are a senior software engineer creating realistic interview practice.
The candidate has shared the project "${repoName}".
Study the code and generate exactly 10 multiple-choice questions for viva and interview preparation.

Priority focus areas: ${focusAreas.join(', ')}

Code files:
${fileContext}

Rules:
- Make the questions feel like real technical interviews, not trivia quizzes.
- Questions should be answerable from practical software understanding and the visible codebase.
- Avoid obscure framework internals, version trivia, and anything the candidate would need to look up.
- Prioritize the selected focus areas, but keep the set balanced and realistic.
- Use code-specific details when helpful, but only when they produce fair questions.
- Mix difficulty as 4 Easy, 4 Medium, and 2 Hard.
- Every question must have exactly 4 options and exactly 1 correct answer.
- Explanations should teach the candidate how to answer the same idea in a viva.
- Vary the correct option position. Do not always put the right answer in the same slot.

Respond ONLY with valid JSON in this exact format:
[
  {
    "text": "question text here",
    "category": "Architecture",
    "difficulty": "Medium",
    "options": [
      "option A",
      "option B",
      "option C",
      "option D"
    ],
    "correctAnswerIndex": 1,
    "explanation": "Explain why the correct answer is right, why the distractors are weaker, and how the candidate could say this in an interview."
  }
]`;

    const response = await client.chat.completions.create({
        model: MODEL,
        messages: [{ role: 'user', content: prompt }],
    });

    const text = response.choices[0]?.message?.content ?? '';
    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    try {
        const parsed = JSON.parse(cleaned) as Question[];
        if (!Array.isArray(parsed) || parsed.length !== 10) {
            throw new Error('Model returned an invalid question set size');
        }

        return parsed.map((question, index) => sanitizeQuestion(question, index));
    } catch {
        console.error('Failed to parse response as JSON:', cleaned);
        throw new Error('Model returned malformed JSON. Raw: ' + cleaned.slice(0, 200));
    }
}

export function evaluateMcqAnswer(question: Question, selectedOptionIndex: number) {
    const isCorrect = selectedOptionIndex === question.correctAnswerIndex;
    const correctOption = question.options[question.correctAnswerIndex];
    const selectedOption = question.options[selectedOptionIndex];

    return {
        isCorrect,
        correctAnswerIndex: question.correctAnswerIndex,
        score: isCorrect ? 10 : 4,
        feedback: isCorrect
            ? `Nice job. You picked "${selectedOption}", which lines up with the strongest interview answer.`
            : `You picked "${selectedOption}". The stronger answer was "${correctOption}" because it better reflects the code and the underlying engineering tradeoff.`,
        aiAnswer: `Best answer: "${correctOption}". ${question.explanation}`,
    };
}
