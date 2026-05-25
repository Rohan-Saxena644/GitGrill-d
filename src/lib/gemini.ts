import OpenAI from 'openai';
import { DifficultyPreset, FocusArea, InterviewStyle, Question, TaggedFile } from '@/types';

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
    if (question.type === 'descriptive') {
        return {
            type: 'descriptive',
            text: question.text?.trim(),
            category: question.category,
            difficulty: question.difficulty,
            explanation: question.explanation?.trim(),
        };
    }

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
        type: 'mcq',
        text: question.text?.trim(),
        category: question.category,
        difficulty: question.difficulty,
        options,
        correctAnswerIndex: question.correctAnswerIndex,
        explanation: question.explanation?.trim(),
    };
}

/**
 * Generates 10 MCQs followed by 2 descriptive interview questions.
 */
export async function generateQuestions(
    taggedFiles: TaggedFile[],
    focusAreas: FocusArea[],
    repoName: string,
    options?: {
        interviewStyle?: InterviewStyle;
        difficultyPreset?: DifficultyPreset;
    }
): Promise<Question[]> {
    const client = getClient();
    const interviewStyle = options?.interviewStyle ?? 'practice';
    const difficultyPreset = options?.difficultyPreset ?? 'balanced';

    const fileContext = taggedFiles
        .filter((file) => file.content)
        .map((file) => `### File: ${file.path} (tagged as: ${file.tag})\n\`\`\`\n${file.content}\n\`\`\``)
        .join('\n\n');

    const styleInstructions =
        interviewStyle === 'interview'
            ? 'Use a realistic interview tone. Questions should feel direct and close to a real live interview.'
            : 'Use a coaching-oriented practice tone. Questions should help the candidate build confidence while staying realistic.';

    const difficultyMix =
        difficultyPreset === 'beginner-friendly'
            ? 'For the 10 MCQs, use difficulty mix: 5 Easy, 4 Medium, 1 Hard. For the 2 descriptive questions, use 1 Medium and 1 Hard.'
            : difficultyPreset === 'challenging'
              ? 'For the 10 MCQs, use difficulty mix: 2 Easy, 5 Medium, 3 Hard. For the 2 descriptive questions, both can be Medium or Hard.'
              : 'For the 10 MCQs, use difficulty mix: 4 Easy, 4 Medium, 2 Hard. For the 2 descriptive questions, use 1 Medium and 1 Hard.';

    const difficultyInstructions =
        difficultyPreset === 'beginner-friendly'
            ? 'Favor practical, answerable questions that a junior or early-mid developer can reason through from the repo.'
            : difficultyPreset === 'challenging'
              ? 'Push a bit deeper on tradeoffs, failure cases, and architecture, but keep every question fair and answerable from visible code and common engineering knowledge.'
              : 'Keep the set balanced between approachable questions and deeper engineering tradeoffs.';

    const prompt = `You are a senior software engineer creating realistic interview practice.
The candidate has shared the project "${repoName}".
Study the code and generate exactly 12 interview-prep questions:
- The first 10 questions must be multiple-choice questions.
- The last 2 questions must be descriptive/free-response questions.

Priority focus areas: ${focusAreas.join(', ')}
Interview style: ${interviewStyle}
Difficulty preset: ${difficultyPreset}

Code files:
${fileContext}

Rules:
- Make the questions feel like real technical interviews, not trivia quizzes.
- Questions should be answerable from practical software understanding and the visible codebase.
- Avoid obscure framework internals, version trivia, and anything the candidate would need to look up.
- Prioritize the selected focus areas, but keep the set balanced and realistic.
- Use code-specific details when helpful, but only when they produce fair questions.
- ${styleInstructions}
- ${difficultyInstructions}
- ${difficultyMix}
- For the 10 MCQs: each must have exactly 4 options and exactly 1 correct answer.
- For the 2 descriptive questions: options must be an empty array and correctAnswerIndex must be omitted.
- Explanations should teach the candidate how to answer the same idea in a viva. For descriptive questions, explanation should act like a strong model answer.
- Vary the correct option position in MCQs.

Respond ONLY with valid JSON in this exact format:
[
  {
    "type": "mcq",
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
  },
  {
    "type": "descriptive",
    "text": "open-ended question here",
    "category": "Performance",
    "difficulty": "Hard",
    "options": [],
    "explanation": "A strong 3-5 sentence model answer that the candidate could adapt in an interview."
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
        if (!Array.isArray(parsed) || parsed.length !== 12) {
            throw new Error('Model returned an invalid question set size');
        }

        const mcqCount = parsed.filter((question) => question.type === 'mcq').length;
        const descriptiveCount = parsed.filter((question) => question.type === 'descriptive').length;
        if (mcqCount !== 10 || descriptiveCount !== 2) {
            throw new Error('Model returned the wrong question type mix');
        }

        return parsed.map((question, index) => sanitizeQuestion(question, index));
    } catch {
        console.error('Failed to parse response as JSON:', cleaned);
        throw new Error('Model returned malformed JSON. Raw: ' + cleaned.slice(0, 200));
    }
}

export function evaluateMcqAnswer(question: Question, selectedOptionIndex: number) {
    const correctAnswerIndex = question.correctAnswerIndex ?? -1;
    const options = question.options ?? [];
    const isCorrect = selectedOptionIndex === correctAnswerIndex;
    const correctOption = options[correctAnswerIndex];
    const selectedOption = options[selectedOptionIndex];

    return {
        isCorrect,
        correctAnswerIndex,
        score: isCorrect ? 10 : 4,
        feedback: isCorrect
            ? `Nice job. You picked "${selectedOption}", which lines up with the strongest interview answer.`
            : `You picked "${selectedOption}". The stronger answer was "${correctOption}" because it better reflects the code and the underlying engineering tradeoff.`,
        aiAnswer: `Best answer: "${correctOption}". ${question.explanation}`,
    };
}

export async function evaluateDescriptiveAnswer(question: Question, userAnswer: string) {
    const client = getClient();

    const prompt = `You are a senior software engineer evaluating an interview answer.

Question: ${question.text}
Expected strong answer:
${question.explanation}

Candidate answer:
${userAnswer}

Evaluate the candidate's answer fairly and briefly.

Respond ONLY with valid JSON:
{
  "score": <number from 1 to 10>,
  "feedback": "<2-3 sentence feedback on what was good and what was missing>",
  "aiAnswer": "<a strong 3-5 sentence model answer>",
  "isCorrect": false
}`;

    const response = await client.chat.completions.create({
        model: MODEL,
        messages: [{ role: 'user', content: prompt }],
    });

    const text = response.choices[0]?.message?.content ?? '';
    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    try {
        const parsed = JSON.parse(cleaned) as {
            score: number;
            feedback: string;
            aiAnswer: string;
            isCorrect?: boolean;
        };

        return {
            score: parsed.score,
            feedback: parsed.feedback,
            aiAnswer: parsed.aiAnswer,
            isCorrect: parsed.score >= 7,
        };
    } catch {
        console.error('Failed to parse descriptive evaluation response:', cleaned);
        throw new Error('Model returned malformed JSON. Raw: ' + cleaned.slice(0, 200));
    }
}
