import OpenAI from 'openai';
import {
    DifficultyPreset,
    FocusArea,
    InterviewStyle,
    InterviewTrack,
    Question,
    SystemTopic,
    TaggedFile,
} from '@/types';

// NOTE: 'google/gemini-2.0-flash-001' was retired from OpenRouter on June 1, 2026
// ("404 No endpoints found"). gemini-2.5-flash is the current active successor
// with a comparable 1M+ token context window.
const MODEL = 'google/gemini-2.5-flash';

function getClient() {
    const apiKey = process.env.OPENROUTER_API_KEY;

    if (!apiKey || apiKey.trim() === '' || apiKey === 'undefined') {
        throw new Error(
            'OPENROUTER_API_KEY is not set or invalid. Add it to your .env.local or Vercel environment variables.'
        );
    }

    const trimmedKey = apiKey.trim();

    // OpenRouter keys always start with "sk-or-". The most common misconfiguration
    // is pasting a Google AI Studio / Gemini key (starts with "AIza...") here, since
    // the model id contains "gemini". That key is valid for Google's API but is
    // unknown to OpenRouter, which responds with "401 User not found".
    if (!trimmedKey.startsWith('sk-or-')) {
        console.error(
            `OPENROUTER_API_KEY does not look like an OpenRouter key (expected it to start with "sk-or-"). ` +
                `Got a value starting with "${trimmedKey.slice(0, 6)}...". ` +
                `Generate a real key at https://openrouter.ai/keys — a Google/Gemini AI Studio key will not work here.`
        );
    }

    return new OpenAI({
        baseURL: 'https://openrouter.ai/api/v1',
        apiKey: apiKey.trim(),
        defaultHeaders: {
            'HTTP-Referer': process.env.NEXTAUTH_URL ?? 'http://localhost:3000',
            'X-Title': 'CodeViva',
        },
    });
}

function sanitizeQuestion(question: Question, index: number): Question {
    if (question.type === 'descriptive' || question.type === 'short-answer') {
        return {
            type: question.type,
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

type GenerateOptions = {
    interviewStyle?: InterviewStyle;
    difficultyPreset?: DifficultyPreset;
    interviewTrack?: InterviewTrack;
    systemTopics?: SystemTopic[];
    resumeContext?: string;
};

function buildSharedPromptBits(options: GenerateOptions) {
    const interviewStyle = options.interviewStyle ?? 'practice';
    const difficultyPreset = options.difficultyPreset ?? 'balanced';

    const styleInstructions =
        interviewStyle === 'interview'
            ? 'Use a realistic interview tone. Questions should feel direct and close to a real live interview.'
            : 'Use a coaching-oriented practice tone. Questions should help the candidate build confidence while staying realistic.';

    const difficultyInstructions =
        difficultyPreset === 'beginner-friendly'
            ? 'Favor practical, answerable questions that a junior or early-mid developer can reason through.'
            : difficultyPreset === 'challenging'
              ? 'Push deeper on tradeoffs, failure cases, and architecture, but keep every question fair and answerable from common engineering knowledge.'
              : 'Keep the set balanced between approachable questions and deeper engineering tradeoffs.';

    return { interviewStyle, difficultyPreset, styleInstructions, difficultyInstructions };
}

/**
 * Repo-viva track: 10 MCQs + 2 descriptive.
 * Systems track: 8 MCQs + 2 short-answer + 2 descriptive.
 */
export async function generateQuestions(
    taggedFiles: TaggedFile[],
    focusAreas: FocusArea[],
    repoName: string,
    options?: GenerateOptions
): Promise<Question[]> {
    const client = getClient();
    const interviewTrack = options?.interviewTrack ?? 'repo-viva';
    const systemTopics = options?.systemTopics ?? [];
    const resumeContext = options?.resumeContext?.trim();
    const { interviewStyle, difficultyPreset, styleInstructions, difficultyInstructions } = buildSharedPromptBits(
        options ?? {}
    );
    const candidateContextBlock = resumeContext
        ? `Candidate background shared by the user:
${resumeContext}
`
        : '';

    const fileContext = taggedFiles
        .filter((file) => file.content)
        .map((file) => `### File: ${file.path} (tagged as: ${file.tag})\n\`\`\`\n${file.content}\n\`\`\``)
        .join('\n\n');

    const repoPrompt = `You are a senior software engineer creating realistic interview practice.
The candidate has shared the project "${repoName}".
Study the code and generate exactly 12 interview-prep questions:
- The first 10 questions must be multiple-choice questions.
- The last 2 questions must be descriptive/free-response questions.

Priority focus areas: ${focusAreas.join(', ')}
Interview style: ${interviewStyle}
Difficulty preset: ${difficultyPreset}

Code files:
${fileContext}

${candidateContextBlock}

Rules:
- Make the questions feel like real technical interviews, not trivia quizzes.
- Questions should be answerable from practical software understanding and the visible codebase.
- Avoid obscure framework internals, version trivia, and anything the candidate would need to look up.
- Prioritize the selected focus areas, but keep the set balanced and realistic.
- Use code-specific details when helpful, but only when they produce fair questions.
- ${styleInstructions}
- ${difficultyInstructions}
- For the 10 MCQs, use an appropriate easy/medium/hard distribution based on the difficulty preset.
- Each MCQ must have exactly 4 answer options and exactly 1 correct answer.
- MCQ options must be meaningful phrases or full-sentence choices, not lazy one-word answers unless absolutely unavoidable.
- The best option should still encourage interview-style reasoning, not pure memorization.
- For the 2 descriptive questions: options must be an empty array and correctAnswerIndex must be omitted.
- Explanations should teach the candidate how to answer the same idea in a viva. For descriptive questions, explanation should act like a strong model answer.

Respond ONLY with valid JSON in this exact format:
[
  {
    "type": "mcq",
    "text": "question text here",
    "category": "Architecture",
    "difficulty": "Medium",
    "options": [
      "A meaningful option written as a full phrase or sentence",
      "Another plausible option written clearly",
      "Another plausible option written clearly",
      "Another plausible option written clearly"
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

    const systemsPrompt = `You are a senior software engineer creating realistic systems and product-engineering interview practice.
The candidate wants scenario-based questions rather than repo-specific questions.
Generate exactly 12 interview-prep questions with this mix:
- 8 multiple-choice questions
- 2 short-answer questions
- 2 descriptive/system-design questions

Systems topics to cover:
${systemTopics.join(', ')}

Cross-cutting focus areas:
${focusAreas.join(', ')}

Interview style: ${interviewStyle}
Difficulty preset: ${difficultyPreset}

${candidateContextBlock}

Rules:
- Make the questions feel like real interviews for engineers who build products, platforms, or backend systems.
- Focus on practical reasoning: tradeoffs, failure handling, scale, user experience, latency, consistency, and maintainability.
- Assume the candidate has not read many pure system design books. Keep the questions fair and grounded in real software intuition.
- ${styleInstructions}
- ${difficultyInstructions}
- Use the selected systems topics heavily, but vary the angle across design, debugging, scaling, reliability, and product behavior.
- The 8 MCQs should test understanding quickly, but the candidate should still have to reason. Do not use one-word answer options. Every option should be a meaningful phrase or sentence.
- The 2 short-answer questions should ask for compact interview responses, like 2-4 sentence answers.
- The 2 descriptive questions should ask for fuller reasoning, tradeoffs, or mini design discussions.
- Short-answer and descriptive questions must have options as an empty array and must omit correctAnswerIndex.
- Explanations for open-ended questions must be written like strong model answers the candidate can learn from.

Examples of the kind of systems scenarios you may use:
- queue retries, dead-letter queues, duplicate events, job ordering
- 1st/2nd/3rd degree connections and recommendations
- cache invalidation, hot keys, rate limit enforcement
- fanout-on-write vs fanout-on-read for notifications or feeds
- search freshness, indexing delays, ranking tradeoffs
- data consistency, partitioning, idempotency, rollback or replay behavior

Respond ONLY with valid JSON in this exact format:
[
  {
    "type": "mcq",
    "text": "scenario-based systems question",
    "category": "Performance",
    "difficulty": "Medium",
    "options": [
      "A meaningful answer option written as a full phrase or sentence",
      "Another plausible answer option written as a full phrase or sentence",
      "Another plausible answer option written as a full phrase or sentence",
      "Another plausible answer option written as a full phrase or sentence"
    ],
    "correctAnswerIndex": 2,
    "explanation": "Explain why the correct choice is the strongest engineering answer and what tradeoff the candidate should mention in an interview."
  },
  {
    "type": "short-answer",
    "text": "A compact systems question that should be answered in 2-4 sentences",
    "category": "Architecture",
    "difficulty": "Medium",
    "options": [],
    "explanation": "A concise but strong model answer."
  },
  {
    "type": "descriptive",
    "text": "A deeper systems design or tradeoff question",
    "category": "Security",
    "difficulty": "Hard",
    "options": [],
    "explanation": "A strong model answer with reasoning and tradeoffs."
  }
]`;

    const prompt = interviewTrack === 'systems' ? systemsPrompt : repoPrompt;

    // Retry once on parse/validation failure — models occasionally produce slightly
    // malformed output on the first attempt.
    let lastError: Error = new Error('Unknown generation error');

    for (let attempt = 1; attempt <= 2; attempt++) {
        let rawText = '';
        try {
            const response = await client.chat.completions.create({
                model: MODEL,
                messages: [{ role: 'user', content: prompt }],
            });

            rawText = response.choices[0]?.message?.content ?? '';

            // Robustly extract the JSON array regardless of markdown fences or
            // any preamble/postamble the model adds.
            const jsonMatch = rawText.match(/\[[\s\S]*\]/);
            if (!jsonMatch) {
                throw new Error('No JSON array found in model response');
            }
            const cleaned = jsonMatch[0].trim();

            const parsed = JSON.parse(cleaned) as Question[];

            if (!Array.isArray(parsed) || parsed.length < 10) {
                throw new Error(`Model returned too few questions (${parsed.length})`);
            }

            // If the model returned more than 12, trim to exactly 12.
            const trimmed = parsed.slice(0, 12);

            const mcqCount = trimmed.filter((q) => q.type === 'mcq').length;
            const shortCount = trimmed.filter((q) => q.type === 'short-answer').length;
            const descriptiveCount = trimmed.filter((q) => q.type === 'descriptive').length;

            if (interviewTrack === 'systems') {
                if (mcqCount < 6 || shortCount < 1 || descriptiveCount < 1) {
                    throw new Error(
                        `Systems track got wrong type mix: ${mcqCount} MCQ, ${shortCount} short, ${descriptiveCount} descriptive`
                    );
                }
            } else {
                if (mcqCount < 8 || descriptiveCount < 1) {
                    throw new Error(
                        `Repo-viva track got wrong type mix: ${mcqCount} MCQ, ${descriptiveCount} descriptive`
                    );
                }
            }

            return trimmed.map((question, index) => sanitizeQuestion(question, index));
        } catch (err: unknown) {
            lastError = err instanceof Error ? err : new Error(String(err));
            console.error(`generateQuestions attempt ${attempt} failed:`, lastError.message);
            if (rawText) {
                console.error('Raw model output (first 400 chars):', rawText.slice(0, 400));
            }

            // 401/403 from OpenRouter means the API key itself was rejected — this is
            // not transient, so retrying won't help and just doubles the wait before
            // the user sees an error. Surface a clear, actionable message instead of
            // the misleading "Failed after 2 attempts. Last error: 401 User not found.".
            const status = (err as { status?: number } | undefined)?.status;
            if (status === 401 || status === 403) {
                throw new Error(
                    `OpenRouter rejected the request (HTTP ${status}: ${lastError.message}). ` +
                        'OPENROUTER_API_KEY is missing, invalid, or revoked on OpenRouter\'s side — this is not related to ' +
                        'app login or guest mode. Get/verify a key at https://openrouter.ai/keys (it should start with ' +
                        '"sk-or-"); a Google AI Studio / Gemini key will not work here.'
                );
            }

            // 404 "No endpoints found" means the model id is deprecated/renamed/removed
            // on OpenRouter — also not transient, retrying with the same id won't help.
            if (status === 404) {
                throw new Error(
                    `OpenRouter has no provider for model "${MODEL}" (HTTP 404: ${lastError.message}). ` +
                        `This model id has likely been deprecated or renamed. Check https://openrouter.ai/google ` +
                        `for the current model id and update the MODEL constant in src/lib/gemini.ts.`
                );
            }


            // Small delay before retry so we don't hammer the API immediately.
            if (attempt < 2) await new Promise((resolve) => setTimeout(resolve, 1000));
        }
    }

    throw new Error(`Failed to generate questions after 2 attempts. Last error: ${lastError.message}`);
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
            : `You picked "${selectedOption}". The stronger answer was "${correctOption}" because it better reflects the engineering tradeoff or implementation choice.`,
        aiAnswer: `Best answer: "${correctOption}". ${question.explanation}`,
    };
}

export async function evaluateOpenEndedAnswer(question: Question, userAnswer: string) {
    const client = getClient();
    const answerExpectation =
        question.type === 'short-answer'
            ? 'The answer should be judged as a compact 2-4 sentence interview response.'
            : 'The answer should be judged as a fuller interview response with reasoning and tradeoffs.';

    const prompt = `You are a senior software engineer evaluating an interview answer.

Question type: ${question.type}
Question: ${question.text}
Expected strong answer:
${question.explanation}

Candidate answer:
${userAnswer}

Evaluation rules:
- ${answerExpectation}
- Be fair and practical, not academic.
- Reward clear thinking, tradeoffs, and correctness.

Respond ONLY with valid JSON:
{
  "score": <number from 1 to 10>,
  "feedback": "<2-3 sentence feedback on what was good and what was missing>",
  "aiAnswer": "<a strong model answer>",
  "isCorrect": false
}`;

    const response = await client.chat.completions.create({
        model: MODEL,
        messages: [{ role: 'user', content: prompt }],
    });

    const text = response.choices[0]?.message?.content ?? '';

    // Robustly extract the JSON object regardless of markdown fences or preamble.
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
        console.error('No JSON object found in evaluation response:', text.slice(0, 400));
        throw new Error('Model returned no parseable JSON. Raw: ' + text.slice(0, 200));
    }
    const cleaned = jsonMatch[0].trim();

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
        console.error('Failed to parse open-ended evaluation response:', cleaned);
        throw new Error('Model returned malformed JSON. Raw: ' + cleaned.slice(0, 200));
    }
}