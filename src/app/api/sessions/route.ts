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
        const {
            repoUrl,
            repoOwner,
            repoName,
            resumeContext,
            taggedFiles,
            focusAreas,
            interviewTrack,
            systemTopics,
            interviewStyle,
            difficultyPreset,
        } = body;

        if ((interviewTrack ?? 'repo-viva') === 'repo-viva' && (!repoUrl || !repoOwner || !repoName)) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        await connectDB();
        const newSession = await Session.create({
            userId,
            repoUrl: repoUrl ?? 'systems://track',
            repoOwner: repoOwner ?? 'Systems',
            repoName: repoName ?? 'Real-World Engineering',
            resumeContext: typeof resumeContext === 'string' ? resumeContext.trim().slice(0, 4000) : undefined,
            taggedFiles: taggedFiles ?? [],
            focusAreas: focusAreas ?? [],
            interviewTrack: interviewTrack ?? 'repo-viva',
            systemTopics: systemTopics ?? [],
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
