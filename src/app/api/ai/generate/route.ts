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
    Question,
    SystemTopic,
    TaggedFile,
} from '@/types';

export const maxDuration = 120;

const PYTHON_SERVICE_URL = process.env.PYTHON_SERVICE_URL;

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

/**
 * Calls the Python service, retrying once if the service is waking up (503).
 * On 503, throws a user-friendly error so the frontend can display it.
 */
async function generateViaPython(payload: object): Promise<Question[]> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 110_000);

    try {
        const res = await fetch(`${PYTHON_SERVICE_URL}/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            signal: controller.signal,
        });

        // Handle cold-start / waking-up state gracefully
        if (res.status === 503) {
            let detail = 'The AI backend is waking up. Please wait a few seconds and try again.';
            try {
                const body = await res.json() as { detail?: string; message?: string };
                if (body.detail || body.message) {
                    detail = body.detail ?? body.message ?? detail;
                }
            } catch {
                // ignore JSON parse errors
            }
            throw new Error(`SERVICE_WAKING_UP: ${detail}`);
        }

        if (!res.ok) {
            const err = await res.text().catch(() => `HTTP ${res.status}`);
            throw new Error(`Python service returned ${res.status}: ${err.slice(0, 200)}`);
        }

        const data = await res.json() as { questions?: Question[]; error?: string };

        if (data.error) throw new Error(`Python service error: ${data.error}`);
        if (!Array.isArray(data.questions) || data.questions.length === 0) {
            throw new Error('Python service returned no questions');
        }

        return data.questions;
    } catch (err: unknown) {
        if (err instanceof Error && err.name === 'AbortError') {
            throw new Error('Question generation timed out (>110s). Try selecting fewer files or a simpler repo.');
        }
        throw err;
    } finally {
        clearTimeout(timeout);
    }
}

async function generateWithFallback(
    payload: object,
    taggedFiles: TaggedFile[],
    focusAreas: FocusArea[],
    repoName: string,
    options: {
        interviewTrack?: InterviewTrack;
        systemTopics?: SystemTopic[];
        interviewStyle?: InterviewStyle;
        difficultyPreset?: DifficultyPreset;
        resumeContext?: string;
    }
): Promise<Question[]> {
    if (PYTHON_SERVICE_URL) {
        try {
            return await generateViaPython(payload);
        } catch (pythonErr: unknown) {
            const msg = pythonErr instanceof Error ? pythonErr.message : String(pythonErr);

            // Surface the "waking up" message to the user instead of silently falling back
            if (msg.startsWith('SERVICE_WAKING_UP:')) {
                throw new Error(msg.replace('SERVICE_WAKING_UP:', '').trim());
            }

            console.warn('Python service failed, falling back to Gemini direct:', msg);
        }
    }
    return generateQuestions(taggedFiles, focusAreas, repoName, options);
}

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

            const options = {
                interviewTrack: doc.interviewTrack as InterviewTrack | undefined,
                systemTopics: doc.systemTopics as SystemTopic[] | undefined,
                interviewStyle: doc.interviewStyle as InterviewStyle | undefined,
                difficultyPreset: doc.difficultyPreset as DifficultyPreset | undefined,
                resumeContext: sanitizeResumeContext(doc.resumeContext),
            };

            const questions = await generateWithFallback(
                {
                    repo_owner: doc.repoOwner,
                    repo_name: doc.repoName,
                    tagged_files: filesWithContent,
                    focus_areas: doc.focusAreas,
                    interview_track: doc.interviewTrack ?? 'repo-viva',
                    interview_style: doc.interviewStyle ?? 'practice',
                    difficulty_preset: doc.difficultyPreset ?? 'balanced',
                    system_topics: doc.systemTopics ?? [],
                    resume_context: sanitizeResumeContext(doc.resumeContext),
                },
                filesWithContent,
                doc.focusAreas as FocusArea[],
                doc.repoName,
                options
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

        if (!repoOwner || !repoName || !Array.isArray(focusAreas) || focusAreas.length === 0) {
            return NextResponse.json({ error: 'Missing guest interview inputs' }, { status: 400 });
        }

        const filesWithContent =
            interviewTrack === 'systems'
                ? []
                : await buildFilesWithContent(repoOwner, repoName, (taggedFiles as TaggedFile[]) ?? []);

        const options = {
            interviewTrack: interviewTrack as InterviewTrack | undefined,
            systemTopics: systemTopics as SystemTopic[] | undefined,
            interviewStyle: interviewStyle as InterviewStyle | undefined,
            difficultyPreset: difficultyPreset as DifficultyPreset | undefined,
            resumeContext: sanitizeResumeContext(resumeContext),
        };

        const questions = await generateWithFallback(
            {
                repo_owner: repoOwner,
                repo_name: repoName,
                tagged_files: filesWithContent,
                focus_areas: focusAreas,
                interview_track: interviewTrack ?? 'repo-viva',
                interview_style: interviewStyle ?? 'practice',
                difficulty_preset: difficultyPreset ?? 'balanced',
                system_topics: systemTopics ?? [],
                resume_context: sanitizeResumeContext(resumeContext),
            },
            filesWithContent,
            focusAreas as FocusArea[],
            repoName,
            options
        );

        return NextResponse.json({ questions, taggedFiles: filesWithContent });

    } catch (error: unknown) {
        console.error('Error generating questions:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Internal Server Error' },
            { status: 500 }
        );
    }
}