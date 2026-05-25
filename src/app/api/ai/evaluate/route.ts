import { NextRequest, NextResponse } from 'next/server';
import { evaluateDescriptiveAnswer, evaluateMcqAnswer } from '@/lib/gemini';
import { Question } from '@/types';

// POST /api/ai/evaluate
// Body: { question, selectedOptionIndex? , userAnswer? }
export async function POST(req: NextRequest) {
    try {
        const { question, selectedOptionIndex, userAnswer } = (await req.json()) as {
            question?: Question;
            selectedOptionIndex?: number;
            userAnswer?: string;
        };

        if (!question) {
            return NextResponse.json({ error: 'question is required' }, { status: 400 });
        }

        if (question.type === 'descriptive') {
            if (!userAnswer?.trim()) {
                return NextResponse.json({ error: 'userAnswer is required' }, { status: 400 });
            }

            return NextResponse.json(await evaluateDescriptiveAnswer(question, userAnswer));
        }

        if (typeof selectedOptionIndex !== 'number') {
            return NextResponse.json(
                { error: 'selectedOptionIndex is required for MCQ questions' },
                { status: 400 }
            );
        }

        if (!Array.isArray(question.options) || question.options.length !== 4) {
            return NextResponse.json({ error: 'Question is missing valid options' }, { status: 400 });
        }

        if (selectedOptionIndex < 0 || selectedOptionIndex > 3) {
            return NextResponse.json({ error: 'Invalid selected option' }, { status: 400 });
        }

        return NextResponse.json(evaluateMcqAnswer(question, selectedOptionIndex));
    } catch (error: any) {
        console.error('Error evaluating answer:', error);
        return NextResponse.json(
            { error: error.message || 'Internal Server Error' },
            { status: 500 }
        );
    }
}
