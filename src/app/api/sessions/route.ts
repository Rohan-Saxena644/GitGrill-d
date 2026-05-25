import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongoose';
import Session from '@/models/Session';

// GET /api/sessions — get all sessions for the logged-in user
export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userId = (session.user as { userId?: string }).userId;

        await connectDB();
        const sessions = await Session.find({ userId })
            .sort({ createdAt: -1 })
            .select('-taggedFiles.content -answers.aiAnswer') // reduce payload size
            .lean();

        return NextResponse.json(sessions);
    } catch (e: any) {
        console.error('Error fetching sessions:', e);
        return NextResponse.json({ error: e.message || 'Internal Server Error' }, { status: 500 });
    }
}

// POST /api/sessions — create a new interview session
export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userId = (session.user as { userId?: string }).userId;
        const body = await req.json();
        const { repoUrl, repoOwner, repoName, taggedFiles, focusAreas, interviewStyle, difficultyPreset } = body;

        if (!repoUrl || !repoOwner || !repoName) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        await connectDB();
        const newSession = await Session.create({
            userId,
            repoUrl,
            repoOwner,
            repoName,
            taggedFiles: taggedFiles ?? [],
            focusAreas: focusAreas ?? [],
            interviewStyle: interviewStyle ?? 'practice',
            difficultyPreset: difficultyPreset ?? 'balanced',
            questions: [],
            answers: [],
            status: 'draft',
        });

        return NextResponse.json(newSession, { status: 201 });
    } catch (e: any) {
        console.error('Error creating session:', e);
        return NextResponse.json({ error: e.message || 'Internal Server Error' }, { status: 500 });
    }
}
