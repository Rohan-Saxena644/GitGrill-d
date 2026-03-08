import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { evaluateAnswer } from '@/lib/gemini';

// POST /api/ai/evaluate
// Body: { question: string, userAnswer: string, fileContext: string }
// Returns: { score, feedback, aiAnswer }
export async function POST(req: NextRequest) {
    const authSession = await getServerSession(authOptions);
    if (!authSession?.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { question, userAnswer, fileContext } = await req.json();

    if (!question || !userAnswer) {
        return NextResponse.json({ error: 'question and userAnswer are required' }, { status: 400 });
    }

    const result = await evaluateAnswer(question, userAnswer, fileContext ?? '');
    return NextResponse.json(result);
}
