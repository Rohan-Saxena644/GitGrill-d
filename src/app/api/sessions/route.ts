import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongoose';
import Session from '@/models/Session';

// GET /api/sessions — get all sessions for the logged-in user
export async function GET() {
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
}

// POST /api/sessions — create a new interview session
export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as { userId?: string }).userId;
    const body = await req.json();
    const { repoUrl, repoOwner, repoName, taggedFiles, focusAreas } = body;

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
        questions: [],
        answers: [],
        status: 'draft',
    });

    return NextResponse.json(newSession, { status: 201 });
}
