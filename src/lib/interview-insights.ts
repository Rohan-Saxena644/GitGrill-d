import { Answer, ISession, Question, QuestionType } from '@/types';

type ScoreBreakdown = {
    label: string;
    avgScore: number;
    answered: number;
};

export type InterviewInsights = {
    strongestCategory: ScoreBreakdown | null;
    weakestCategory: ScoreBreakdown | null;
    hardestCategory: {
        label: string;
        hardCount: number;
    } | null;
    categoryBreakdown: ScoreBreakdown[];
    typeBreakdown: ScoreBreakdown[];
};

function roundToTenth(value: number) {
    return Math.round(value * 10) / 10;
}

function buildScoreBreakdown<T extends string>(
    entries: { label: T; score: number }[]
): ScoreBreakdown[] {
    const grouped = new Map<string, number[]>();

    for (const entry of entries) {
        const current = grouped.get(entry.label) ?? [];
        current.push(entry.score);
        grouped.set(entry.label, current);
    }

    return Array.from(grouped.entries())
        .map(([label, scores]) => ({
            label,
            avgScore: roundToTenth(scores.reduce((sum, score) => sum + score, 0) / scores.length),
            answered: scores.length,
        }))
        .sort((a, b) => a.avgScore - b.avgScore || a.label.localeCompare(b.label));
}

export function buildInterviewInsights(session: Pick<ISession, 'questions' | 'answers'>): InterviewInsights {
    const answeredPairs = session.answers
        .map((answer) => {
            const question = session.questions[answer.questionIndex];
            if (!question || answer.score === undefined) {
                return null;
            }

            return { question, answer };
        })
        .filter((pair): pair is { question: Question; answer: Answer } => Boolean(pair));

    const categoryBreakdown = buildScoreBreakdown(
        answeredPairs.map(({ question, answer }) => ({
            label: question.category,
            score: answer.score as number,
        }))
    );

    const typeLabels: Record<QuestionType, string> = {
        mcq: 'MCQ',
        'short-answer': 'Short Answer',
        descriptive: 'Descriptive',
    };

    const typeBreakdown = buildScoreBreakdown(
        answeredPairs.map(({ question, answer }) => ({
            label: typeLabels[question.type],
            score: answer.score as number,
        }))
    );

    const strongestCategory =
        categoryBreakdown.length > 0
            ? [...categoryBreakdown].sort((a, b) => b.avgScore - a.avgScore || a.label.localeCompare(b.label))[0]
            : null;
    const weakestCategory = categoryBreakdown[0] ?? null;

    const hardFeelingCounts = new Map<string, number>();
    for (const question of session.questions) {
        if (question.userDifficulty !== 'Hard') continue;
        hardFeelingCounts.set(question.category, (hardFeelingCounts.get(question.category) ?? 0) + 1);
    }

    const hardestCategory =
        hardFeelingCounts.size > 0
            ? Array.from(hardFeelingCounts.entries())
                  .map(([label, hardCount]) => ({ label, hardCount }))
                  .sort((a, b) => b.hardCount - a.hardCount || a.label.localeCompare(b.label))[0]
            : null;

    return {
        strongestCategory,
        weakestCategory,
        hardestCategory,
        categoryBreakdown,
        typeBreakdown,
    };
}
