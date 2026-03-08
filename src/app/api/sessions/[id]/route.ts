import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongoose';
import Session from '@/models/Session';

// GET /api/sessions/[id] — get a single session by ID
export async function GET(
    _req: NextRequest,
    { params }: { params: { id: string } }
) {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as { userId?: string }).userId;

    await connectDB();
    const doc = await Session.findOne({ _id: params.id, userId }).lean();

    if (!doc) {
        return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    return NextResponse.json(doc);
}

// PATCH /api/sessions/[id] — update a session (add questions, answers, status, etc.)
export async function PATCH(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as { userId?: string }).userId;
    const body = await req.json();

    await connectDB();

    // Only allow updating these specific fields (not userId, repoUrl, etc.)
    const allowedUpdates: Record<string, unknown> = {};
    if (body.questions !== undefined) allowedUpdates.questions = body.questions;
    if (body.answers !== undefined) allowedUpdates.answers = body.answers;
    if (body.status !== undefined) allowedUpdates.status = body.status;
    if (body.taggedFiles !== undefined) allowedUpdates.taggedFiles = body.taggedFiles;
    if (body.focusAreas !== undefined) allowedUpdates.focusAreas = body.focusAreas;

    const updated = await Session.findOneAndUpdate(
        { _id: params.id, userId },
        { $set: allowedUpdates },
        { new: true }
    ).lean();

    if (!updated) {
        return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    return NextResponse.json(updated);
}
