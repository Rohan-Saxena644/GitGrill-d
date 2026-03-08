import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongoose';
import Session from '@/models/Session';
import { getFileContent } from '@/lib/github';
import { generateQuestions } from '@/lib/gemini';
import { TaggedFile, FocusArea } from '@/types';

// POST /api/ai/generate
// Body: { sessionId: string }
// Fetches tagged files from DB, calls Gemini, saves questions back to DB
export async function POST(req: NextRequest) {
    const authSession = await getServerSession(authOptions);
    if (!authSession?.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (authSession.user as { userId?: string }).userId;
    const { sessionId } = await req.json();

    await connectDB();
    const doc = await Session.findOne({ _id: sessionId, userId });
    if (!doc) {
        return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Fetch actual file contents from GitHub for each tagged file
    const filesWithContent: TaggedFile[] = await Promise.all(
        doc.taggedFiles.map(async (f: TaggedFile) => {
            const content = await getFileContent(doc.repoOwner, doc.repoName, f.path);
            return { ...f, content: content ?? '// content unavailable' };
        })
    );

    // Generate questions using Gemini
    const questions = await generateQuestions(
        filesWithContent,
        doc.focusAreas as FocusArea[],
        doc.repoName
    );

    // Save questions to the session and mark as active
    doc.questions = questions as typeof doc.questions;
    doc.status = 'active';
    await doc.save();

    return NextResponse.json({ questions });
}
