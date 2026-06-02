import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongoose';
import Session from '@/models/Session';
import { getFileContent } from '@/lib/github';
import { generateQuestions } from '@/lib/gemini';
import {
    DifficultyPreset,
    FocusArea,
    InterviewStyle,
    InterviewTrack,
    SystemTopic,
    TaggedFile,
} from '@/types';

async function buildFilesWithContent(
    repoOwner: string,
    repoName: string,
    taggedFiles: TaggedFile[]
): Promise<TaggedFile[]> {
    return Promise.all(
        taggedFiles.map(async (file) => {
            const content = await getFileContent(repoOwner, repoName, file.path);
            return {
                path: file.path,
                tag: file.tag,
                content: content ?? '// content unavailable',
            };
        })
    );
}

function sanitizeResumeContext(resumeContext: unknown) {
    return typeof resumeContext === 'string' ? resumeContext.trim().slice(0, 4000) : '';
}

// POST /api/ai/generate
// Authenticated: { sessionId }
// Guest: { repoOwner, repoName, taggedFiles, focusAreas }
export async function POST(req: NextRequest) {
    try {
        const authSession = await getServerSession(authOptions);
        const body = await req.json();

        if (body.sessionId) {
            if (!authSession?.user) {
                return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
            }

            const userId = (authSession.user as { userId?: string }).userId;

            await connectDB();
            const doc = await Session.findOne({ _id: body.sessionId, userId });
            if (!doc) {
                return NextResponse.json({ error: 'Session not found' }, { status: 404 });
            }

            const isSystemsTrack = (doc.interviewTrack as InterviewTrack | undefined) === 'systems';
            const filesWithContent = isSystemsTrack
                ? []
                : await buildFilesWithContent(doc.repoOwner, doc.repoName, doc.taggedFiles);
            const questions = await generateQuestions(
                filesWithContent,
                doc.focusAreas as FocusArea[],
                doc.repoName,
                {
                    interviewTrack: doc.interviewTrack as InterviewTrack | undefined,
                    systemTopics: doc.systemTopics as SystemTopic[] | undefined,
                    interviewStyle: doc.interviewStyle as InterviewStyle | undefined,
                    difficultyPreset: doc.difficultyPreset as DifficultyPreset | undefined,
                    resumeContext: sanitizeResumeContext(doc.resumeContext),
                }
            );

            doc.questions = questions as typeof doc.questions;
            doc.status = 'active';
            await doc.save();

            return NextResponse.json({ questions });
        }

        const {
            repoOwner,
            repoName,
            taggedFiles,
            focusAreas,
            interviewTrack,
            systemTopics,
            interviewStyle,
            difficultyPreset,
            resumeContext,
        } = body;

        if (!repoOwner || !repoName || !Array.isArray(focusAreas)) {
            return NextResponse.json({ error: 'Missing guest interview inputs' }, { status: 400 });
        }

        const filesWithContent =
            interviewTrack === 'systems'
                ? []
                : await buildFilesWithContent(repoOwner, repoName, taggedFiles as TaggedFile[]);
        const questions = await generateQuestions(filesWithContent, focusAreas as FocusArea[], repoName, {
            interviewTrack: interviewTrack as InterviewTrack | undefined,
            systemTopics: systemTopics as SystemTopic[] | undefined,
            interviewStyle: interviewStyle as InterviewStyle | undefined,
            difficultyPreset: difficultyPreset as DifficultyPreset | undefined,
            resumeContext: sanitizeResumeContext(resumeContext),
        });

        return NextResponse.json({
            questions,
            taggedFiles: filesWithContent,
        });
    } catch (error: any) {
        console.error('Error generating questions:', error);
        return NextResponse.json(
            { error: error.message || 'Internal Server Error' },
            { status: 500 }
        );
    }
}
