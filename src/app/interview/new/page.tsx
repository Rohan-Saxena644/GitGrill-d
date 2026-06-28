'use client';

import { useCallback, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn, useSession } from 'next-auth/react';
import GeneratingOverlay from '@/components/GeneratingOverlay';
import {
    AlertCircle,
    Check,
    ChevronRight,
    Chrome,
    GitBranch,
    Github,
    Layers3,
    Loader2,
    Tag,
    Target,
} from 'lucide-react';
import { createGuestSession, saveGuestSession } from '@/lib/guest-session';
import {
    DifficultyPreset,
    FileTag,
    FocusArea,
    GitHubFile,
    ISession,
    InterviewStyle,
    InterviewTrack,
    SystemTopic,
} from '@/types';
import { buildSuggestedTags } from '@/lib/file-tagging';

const FOCUS_AREAS: FocusArea[] = ['Architecture', 'Error Handling', 'Performance', 'Security'];

const SYSTEM_TOPIC_OPTIONS: SystemTopic[] = [
    'Message Queue / Async Processing',
    'Graph / Recommendations / Connections',
    'Caching / Rate Limiting',
    'Notifications / Feed Fanout',
    'Search / Indexing',
    'Data Modeling / Consistency',
];

const TAG_OPTIONS: { value: FileTag; label: string; color: string }[] = [
    { value: 'untagged', label: 'Skip', color: '#7d7165' },
    { value: 'core-logic', label: 'Core Logic', color: '#e8825a' },
    { value: 'boilerplate', label: 'Boilerplate', color: '#ab9d90' },
    { value: 'config', label: 'Config', color: '#e0ad55' },
    { value: 'tests', label: 'Tests', color: '#9cba78' },
];

const TRACK_OPTIONS: {
    value: InterviewTrack;
    title: string;
    description: string;
    icon: React.ReactNode;
}[] = [
    {
        value: 'repo-viva',
        title: 'Repo Viva Track',
        description: 'Interview questions based on your tagged GitHub project files.',
        icon: <GitBranch size={18} />,
    },
    {
        value: 'systems',
        title: 'Systems Track',
        description: 'Scenario-based product engineering and system design practice.',
        icon: <Layers3 size={18} />,
    },
];

const INTERVIEW_STYLE_OPTIONS: {
    value: InterviewStyle;
    title: string;
    description: string;
}[] = [
    {
        value: 'practice',
        title: 'Practice Mode',
        description: 'More coaching-oriented wording with learning-friendly explanations.',
    },
    {
        value: 'interview',
        title: 'Interview Mode',
        description: 'Sharper, more live-interview-style questioning while still staying fair.',
    },
];

const DIFFICULTY_PRESET_OPTIONS: {
    value: DifficultyPreset;
    title: string;
    description: string;
}[] = [
    {
        value: 'beginner-friendly',
        title: 'Beginner Friendly',
        description: 'More approachable questions with a softer ramp into deeper systems ideas.',
    },
    {
        value: 'balanced',
        title: 'Balanced',
        description: 'A steady mix of easier checks, short answers, and deeper tradeoff questions.',
    },
    {
        value: 'challenging',
        title: 'Challenging',
        description: 'More tradeoffs, sharper scenarios, and tougher interview-style questions.',
    },
];

export default function NewInterviewPage() {
    const { data: session, status } = useSession();
    const router = useRouter();

    const [step, setStep] = useState<1 | 2 | 3>(1);
    const [track, setTrack] = useState<InterviewTrack>('repo-viva');
    const [repoUrl, setRepoUrl] = useState('');
    const [repoOwner, setRepoOwner] = useState('');
    const [repoName, setRepoName] = useState('');
    const [files, setFiles] = useState<GitHubFile[]>([]);
    const [tags, setTags] = useState<Record<string, FileTag>>({});
    const [focusAreas, setFocusAreas] = useState<FocusArea[]>([]);
    const [systemTopics, setSystemTopics] = useState<SystemTopic[]>([
        'Message Queue / Async Processing',
        'Graph / Recommendations / Connections',
    ]);
    const [interviewStyle, setInterviewStyle] = useState<InterviewStyle>('practice');
    const [difficultyPreset, setDifficultyPreset] = useState<DifficultyPreset>('balanced');
    const [resumeContext, setResumeContext] = useState('');
    const [loading, setLoading] = useState(false);
    const [isWakingUp, setIsWakingUp] = useState(false);
    const [error, setError] = useState('');
    const stepConfig = useMemo(
        () => [
            { n: 1, label: track === 'repo-viva' ? 'Track & Repo' : 'Choose Track', icon: <GitBranch size={14} /> },
            { n: 2, label: track === 'repo-viva' ? 'Tag Files' : 'Choose Topics', icon: <Tag size={14} /> },
            { n: 3, label: 'Tune & Generate', icon: <Target size={14} /> },
        ],
        [track]
    );


    // Called by the overlay countdown when backend wakes up
    const retryGenerate = useCallback(() => {
        setIsWakingUp(false);
        doGenerate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);


    if (status === 'loading') {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
                <div className="spinner" style={{ width: 40, height: 40 }} />
            </div>
        );
    }

    async function fetchFiles() {
        if (loading || track !== 'repo-viva') return;
        setError('');
        setLoading(true);

        try {
            const res = await fetch('/api/repo/files', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ repoUrl }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error ?? 'Failed to fetch files');

            setFiles(data.files);
            setRepoOwner(data.owner);
            setRepoName(data.repo);

            setTags(buildSuggestedTags(data.files));
            setStep(2);
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : 'Something went wrong');
        } finally {
            setLoading(false);
        }
    }

    function continueFromStepOne() {
        if (track === 'repo-viva') {
            fetchFiles();
            return;
        }
        setStep(2);
    }

   

    async function generateQuestions() {
        setIsWakingUp(false);
        doGenerate();
    }

    async function doGenerate() {
        if (loading) return;
        setError('');
        setLoading(true);

        try {
            const taggedFiles =
                track === 'repo-viva'
                    ? Object.entries(tags)
                          .filter(([, tag]) => tag !== 'untagged')
                          .map(([path, tag]) => ({ path, tag }))
                    : [];

            if (track === 'repo-viva' && taggedFiles.length === 0) {
                throw new Error('Please tag at least one file as something other than Skip.');
            }
            if (focusAreas.length === 0) {
                throw new Error('Please select at least one focus area.');
            }
            if (track === 'systems' && systemTopics.length === 0) {
                throw new Error('Please select at least one systems topic.');
            }

            const createPayload =
                track === 'repo-viva'
                    ? {
                          repoUrl,
                          repoOwner,
                          repoName,
                          resumeContext: resumeContext.trim(),
                          taggedFiles,
                          focusAreas,
                          interviewTrack: track,
                          systemTopics,
                          interviewStyle,
                          difficultyPreset,
                      }
                    : {
                          repoUrl: 'systems://track',
                          repoOwner: 'Systems',
                          repoName: 'Real-World Engineering',
                          resumeContext: resumeContext.trim(),
                          taggedFiles: [],
                          focusAreas,
                          interviewTrack: track,
                          systemTopics,
                          interviewStyle,
                          difficultyPreset,
                      };

            if (session) {
                const createRes = await fetch('/api/sessions', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(createPayload),
                });
                const savedSession = await createRes.json();
                if (!createRes.ok) throw new Error(savedSession.error ?? 'Failed to create session');

                const genRes = await fetch('/api/ai/generate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ sessionId: savedSession._id }),
                });
                const generated = await genRes.json();
                if (!genRes.ok) throw new Error(generated.error ?? 'Failed to generate questions');

                router.push(`/interview/${savedSession._id}`);
                return;
            }

            const genRes = await fetch('/api/ai/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    repoOwner: track === 'repo-viva' ? repoOwner : 'Systems',
                    repoName: track === 'repo-viva' ? repoName : 'Real-World Engineering',
                    taggedFiles,
                    focusAreas,
                    resumeContext: resumeContext.trim(),
                    interviewTrack: track,
                    systemTopics,
                    interviewStyle,
                    difficultyPreset,
                }),
            });
            const generated = await genRes.json();
            if (!genRes.ok) throw new Error(generated.error ?? 'Failed to generate questions');

            const guestSession = createGuestSession({
                _id: 'guest',
                repoUrl: track === 'repo-viva' ? repoUrl : 'systems://track',
                repoOwner: track === 'repo-viva' ? repoOwner : 'Systems',
                repoName: track === 'repo-viva' ? repoName : 'Real-World Engineering',
                resumeContext: resumeContext.trim(),
                taggedFiles: generated.taggedFiles ?? taggedFiles,
                focusAreas,
                interviewTrack: track,
                systemTopics,
                interviewStyle,
                difficultyPreset,
                questions: generated.questions,
                answers: [],
                status: 'active',
            } as ISession);

            saveGuestSession(guestSession);
            router.push('/interview/guest');
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : 'Something went wrong';
            // Detect cold-start: route.ts throws this specific message on 503
            if (msg.toLowerCase().includes('waking up')) {
                setIsWakingUp(true);
                // keep loading=true so overlay stays visible during countdown
                return;
            }
            setError(msg);
            setLoading(false);
        }
    }

    const taggedCount = Object.values(tags).filter((tag) => tag !== 'untagged').length;

    return (
        <div className="page-container" style={{ padding: 'clamp(24px,5vw,48px) 16px', maxWidth: 940 }}>
            {!session && (
                <div
                    className="glass-card"
                    style={{
                        padding: '18px 20px',
                        marginBottom: 20,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: 16,
                        flexWrap: 'wrap',
                    }}
                >
                    <div>
                        <div style={{ color: '#f5ece1', fontWeight: 600, marginBottom: 4 }}>Guest mode is on</div>
                        <p style={{ color: '#ab9d90', fontSize: '0.86rem', lineHeight: 1.6 }}>
                            You can complete the full interview without logging in. Guest results are not saved and
                            disappear after 15 minutes of inactivity.
                        </p>
                    </div>
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                        <button className="btn-secondary" onClick={() => signIn('google')}>
                            <Chrome size={16} /> Save with Google
                        </button>
                        <button className="btn-primary" onClick={() => signIn('github')}>
                            <Github size={16} /> Save with GitHub
                        </button>
                    </div>
                </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 36 }}>
                {stepConfig.map((item, index) => (
                    <div key={item.n} style={{ display: 'flex', alignItems: 'center', flex: index < 2 ? 1 : 'none' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div
                                className={
                                    step > item.n
                                        ? 'step-dot step-dot-done'
                                        : step === item.n
                                          ? 'step-dot step-dot-active'
                                          : 'step-dot step-dot-idle'
                                }
                            >
                                {step > item.n ? <Check size={14} /> : item.n}
                            </div>
                            <span
                                className="step-label"
                                style={{
                                    fontSize: '0.82rem',
                                    fontWeight: 500,
                                    color: step >= item.n ? '#f5ece1' : '#7d7165',
                                    whiteSpace: 'nowrap',
                                }}
                            >
                                {item.label}
                            </span>
                        </div>
                        {index < 2 && (
                            <div
                                style={{
                                    flex: 1,
                                    height: 1,
                                    background:
                                        step > item.n ? 'rgba(232,130,90,0.4)' : 'rgba(212,150,110,0.12)',
                                    margin: '0 12px',
                                }}
                            />
                        )}
                    </div>
                ))}
            </div>

            {error && (
                <div
                    style={{
                        padding: '12px 16px',
                        borderRadius: 10,
                        marginBottom: 20,
                        background: 'rgba(216,101,79,0.08)',
                        border: '1px solid rgba(216,101,79,0.25)',
                        color: '#d8654f',
                        display: 'flex',
                        gap: 10,
                        alignItems: 'flex-start',
                    }}
                >
                    <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 2 }} />
                    <span style={{ fontSize: '0.9rem' }}>{error}</span>
                </div>
            )}

            {step === 1 && (
                <div className="glass-card animate-fade-in" style={{ padding: 'clamp(20px,5vw,32px)' }}>
                    <h2 style={{ color: '#f5ece1', fontWeight: 700, fontSize: 'clamp(1.1rem,3vw,1.4rem)', marginBottom: 8 }}>
                        Choose your track
                    </h2>
                    <p style={{ color: '#ab9d90', marginBottom: 24, fontSize: '0.875rem' }}>
                        Pick between repo-based viva prep and a systems track with scenario questions that need fuller interview-style answers.
                    </p>

                    <div
                        style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%,260px), 1fr))',
                            gap: 12,
                            marginBottom: 24,
                        }}
                    >
                        {TRACK_OPTIONS.map((option) => {
                            const active = track === option.value;
                            return (
                                <button
                                    key={option.value}
                                    onClick={() => {
                                        setTrack(option.value);
                                        setError('');
                                    }}
                                    style={{
                                        padding: '18px',
                                        borderRadius: 14,
                                        border: active ? '1px solid rgba(232,130,90,0.6)' : '1px solid var(--border)',
                                        background: active ? 'rgba(232,130,90,0.08)' : 'rgba(34,28,22,0.4)',
                                        color: '#f5ece1',
                                        cursor: 'pointer',
                                        textAlign: 'left',
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                                        <span style={{ color: active ? '#e8825a' : '#ab9d90' }}>{option.icon}</span>
                                        <span style={{ fontWeight: 600 }}>{option.title}</span>
                                    </div>
                                    <div style={{ color: '#ab9d90', fontSize: '0.84rem', lineHeight: 1.6 }}>
                                        {option.description}
                                    </div>
                                </button>
                            );
                        })}
                    </div>

                    {track === 'repo-viva' ? (
                        <>
                            <div style={{ color: '#f5ece1', fontWeight: 600, marginBottom: 8 }}>Paste your GitHub repo URL</div>
                            <p style={{ color: '#ab9d90', marginBottom: 18, fontSize: '0.875rem' }}>
                                Public repositories work best. This track generates 10 MCQs plus 2 descriptive questions from your tagged files.
                            </p>
                            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                                <input
                                    className="input"
                                    placeholder="https://github.com/username/repository"
                                    value={repoUrl}
                                    onChange={(e) => setRepoUrl(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && continueFromStepOne()}
                                    style={{ flex: '1 1 240px', minWidth: 0 }}
                                />
                                <button
                                    className="btn-primary"
                                    onClick={continueFromStepOne}
                                    disabled={loading || !repoUrl.trim()}
                                    style={{ flexShrink: 0, justifyContent: 'center' }}
                                >
                                    {loading ? <Loader2 className="spinner" /> : <><ChevronRight size={18} /> Fetch Files</>}
                                </button>
                            </div>
                        </>
                    ) : (
                        <div
                            style={{
                                padding: '14px 16px',
                                borderRadius: 12,
                                background: 'rgba(232,130,90,0.05)',
                                border: '1px solid rgba(232,130,90,0.12)',
                                color: '#ab9d90',
                                fontSize: '0.86rem',
                                lineHeight: 1.65,
                            }}
                        >
                            Systems track skips repo upload and focuses on real-world engineering topics like queues, recommendations, caching, fanout, search, and consistency.
                            <div style={{ marginTop: 14 }}>
                                <button className="btn-primary" onClick={continueFromStepOne}>
                                    Continue to Topics <ChevronRight size={18} />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {step === 2 && track === 'repo-viva' && (
                <div className="animate-fade-in">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, gap: 16, flexWrap: 'wrap' }}>
                        <div>
                            <h2 style={{ color: '#f5ece1', fontWeight: 700, fontSize: 'clamp(1.1rem,3vw,1.4rem)', marginBottom: 4 }}>
                                Tag your files
                            </h2>
                            <p style={{ color: '#ab9d90', fontSize: '0.85rem' }}>
                                <strong style={{ color: '#f5ece1' }}>{files.length}</strong> files in{' '}
                                <strong style={{ color: '#e8825a' }}>{repoOwner}/{repoName}</strong>. Start from the suggested tags, then adjust the parts you want the interview to focus on.
                            </p>
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                            <div style={{ color: '#e8825a', fontWeight: 800, fontSize: '1.6rem', lineHeight: 1 }}>{taggedCount}</div>
                            <div style={{ color: '#7d7165', fontSize: '0.72rem', marginTop: 2 }}>tagged</div>
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
                        {TAG_OPTIONS.map((tagOption) => (
                            <span
                                key={tagOption.value}
                                style={{
                                    fontSize: '0.72rem',
                                    padding: '3px 10px',
                                    borderRadius: 20,
                                    color: tagOption.color,
                                    background: `${tagOption.color}18`,
                                    border: `1px solid ${tagOption.color}40`,
                                }}
                            >
                                {tagOption.label}
                            </span>
                        ))}
                    </div>

                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
                        <button className="btn-secondary" onClick={() => setTags(buildSuggestedTags(files))}>
                            Auto-tag suggestions
                        </button>
                        <button
                            className="btn-secondary"
                            onClick={() =>
                                setTags(
                                    files.reduce<Record<string, FileTag>>((acc, file) => {
                                        acc[file.path] = 'untagged';
                                        return acc;
                                    }, {})
                                )
                            }
                        >
                            Clear tags
                        </button>
                    </div>

                    <div className="glass-card" style={{ padding: 0, maxHeight: '52vh', overflowY: 'auto' }}>
                        {files.map((file, index) => (
                            <div
                                key={file.path}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    gap: 12,
                                    padding: '10px 16px',
                                    borderBottom: index < files.length - 1 ? '1px solid rgba(212,150,110,0.07)' : 'none',
                                }}
                            >
                                <span
                                    style={{
                                        color: tags[file.path] === 'untagged' ? '#695e54' : '#f5ece1',
                                        fontSize: '0.8rem',
                                        fontFamily: 'monospace',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                        flex: 1,
                                        minWidth: 0,
                                    }}
                                >
                                    {file.path}
                                </span>
                                <select
                                    value={tags[file.path] ?? 'untagged'}
                                    onChange={(e) => setTags({ ...tags, [file.path]: e.target.value as FileTag })}
                                    style={{
                                        background: 'var(--bg-secondary)',
                                        color: 'var(--text-primary)',
                                        border: '1px solid var(--border)',
                                        borderRadius: 6,
                                        padding: '4px 8px',
                                        fontSize: '0.78rem',
                                        cursor: 'pointer',
                                        flexShrink: 0,
                                        outline: 'none',
                                    }}
                                >
                                    {TAG_OPTIONS.map((tagOption) => (
                                        <option key={tagOption.value} value={tagOption.value}>
                                            {tagOption.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        ))}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
                        <button className="btn-primary" disabled={taggedCount === 0} onClick={() => setStep(3)}>
                            Continue <ChevronRight size={18} />
                        </button>
                    </div>
                </div>
            )}

            {step === 2 && track === 'systems' && (
                <div className="glass-card animate-fade-in" style={{ padding: 'clamp(20px,5vw,32px)' }}>
                    <h2 style={{ color: '#f5ece1', fontWeight: 700, fontSize: 'clamp(1.1rem,3vw,1.4rem)', marginBottom: 8 }}>
                        Choose systems topics
                    </h2>
                    <p style={{ color: '#ab9d90', fontSize: '0.875rem', marginBottom: 24 }}>
                        Pick the topics you want to be interviewed on. The systems track uses richer answer options and a mix of MCQs, short-answer prompts, and deeper descriptive questions.
                    </p>

                    <div
                        style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%,240px), 1fr))',
                            gap: 12,
                            marginBottom: 24,
                        }}
                    >
                        {SYSTEM_TOPIC_OPTIONS.map((topic) => {
                            const active = systemTopics.includes(topic);
                            return (
                                <button
                                    key={topic}
                                    onClick={() =>
                                        setSystemTopics(
                                            active
                                                ? systemTopics.filter((currentTopic) => currentTopic !== topic)
                                                : [...systemTopics, topic]
                                        )
                                    }
                                    style={{
                                        padding: '16px',
                                        borderRadius: 12,
                                        border: active ? '1px solid rgba(232,130,90,0.6)' : '1px solid var(--border)',
                                        background: active ? 'rgba(232,130,90,0.08)' : 'rgba(34,28,22,0.4)',
                                        color: active ? '#f5ece1' : '#ab9d90',
                                        cursor: 'pointer',
                                        textAlign: 'left',
                                        fontSize: '0.9rem',
                                        lineHeight: 1.55,
                                    }}
                                >
                                    {topic}
                                </button>
                            );
                        })}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <button className="btn-primary" disabled={systemTopics.length === 0} onClick={() => setStep(3)}>
                            Continue <ChevronRight size={18} />
                        </button>
                    </div>
                </div>
            )}

            {step === 3 && (
                <div className="glass-card animate-fade-in" style={{ padding: 'clamp(20px,5vw,32px)' }}>
                    <h2 style={{ color: '#f5ece1', fontWeight: 700, fontSize: 'clamp(1.1rem,3vw,1.4rem)', marginBottom: 8 }}>
                        Tune the interview
                    </h2>
                    <p style={{ color: '#ab9d90', fontSize: '0.875rem', marginBottom: 24 }}>
                        {track === 'repo-viva'
                            ? 'This track gives you 10 MCQs and 2 descriptive repo-based questions.'
                            : 'This track gives you a more answer-heavy systems mix with MCQs, short-answer prompts, and descriptive design questions.'}
                    </p>

                    <div style={{ marginBottom: 24 }}>
                        <div style={{ color: '#f5ece1', fontWeight: 600, marginBottom: 10 }}>Interview style</div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%,220px), 1fr))', gap: 12 }}>
                            {INTERVIEW_STYLE_OPTIONS.map((option) => {
                                const active = interviewStyle === option.value;
                                return (
                                    <button
                                        key={option.value}
                                        onClick={() => setInterviewStyle(option.value)}
                                        style={{
                                            padding: '16px',
                                            borderRadius: 12,
                                            border: active ? '1px solid rgba(232,130,90,0.6)' : '1px solid var(--border)',
                                            background: active ? 'rgba(232,130,90,0.08)' : 'rgba(34,28,22,0.4)',
                                            color: '#f5ece1',
                                            cursor: 'pointer',
                                            textAlign: 'left',
                                        }}
                                    >
                                        <div style={{ fontWeight: 600, marginBottom: 6 }}>{option.title}</div>
                                        <div style={{ color: '#ab9d90', fontSize: '0.84rem', lineHeight: 1.6 }}>
                                            {option.description}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div style={{ marginBottom: 24 }}>
                        <div style={{ color: '#f5ece1', fontWeight: 600, marginBottom: 10 }}>Difficulty preset</div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%,220px), 1fr))', gap: 12 }}>
                            {DIFFICULTY_PRESET_OPTIONS.map((option) => {
                                const active = difficultyPreset === option.value;
                                return (
                                    <button
                                        key={option.value}
                                        onClick={() => setDifficultyPreset(option.value)}
                                        style={{
                                            padding: '16px',
                                            borderRadius: 12,
                                            border: active ? '1px solid rgba(232,130,90,0.6)' : '1px solid var(--border)',
                                            background: active ? 'rgba(232,130,90,0.08)' : 'rgba(34,28,22,0.4)',
                                            color: '#f5ece1',
                                            cursor: 'pointer',
                                            textAlign: 'left',
                                        }}
                                    >
                                        <div style={{ fontWeight: 600, marginBottom: 6 }}>{option.title}</div>
                                        <div style={{ color: '#ab9d90', fontSize: '0.84rem', lineHeight: 1.6 }}>
                                            {option.description}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div style={{ color: '#f5ece1', fontWeight: 600, marginBottom: 10 }}>
                        {track === 'repo-viva' ? 'Focus areas' : 'Cross-cutting focus areas'}
                    </div>
                    <div
                        style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%,180px), 1fr))',
                            gap: 12,
                            marginBottom: 24,
                        }}
                    >
                        {FOCUS_AREAS.map((area) => {
                            const active = focusAreas.includes(area);
                            return (
                                <button
                                    key={area}
                                    onClick={() =>
                                        setFocusAreas(
                                            active
                                                ? focusAreas.filter((currentArea) => currentArea !== area)
                                                : [...focusAreas, area]
                                        )
                                    }
                                    style={{
                                        padding: '16px',
                                        borderRadius: 12,
                                        border: active ? '1px solid rgba(232,130,90,0.6)' : '1px solid var(--border)',
                                        background: active ? 'rgba(232,130,90,0.08)' : 'rgba(34,28,22,0.4)',
                                        color: active ? '#e8825a' : '#ab9d90',
                                        fontWeight: active ? 600 : 400,
                                        cursor: 'pointer',
                                        textAlign: 'left',
                                        fontSize: '0.9rem',
                                        transition: 'all 0.15s',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 10,
                                    }}
                                >
                                    <div
                                        style={{
                                            width: 20,
                                            height: 20,
                                            borderRadius: 6,
                                            flexShrink: 0,
                                            border: active ? '2px solid #e8825a' : '2px solid #7d7165',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                        }}
                                    >
                                        {active && <Check size={12} color="#e8825a" />}
                                    </div>
                                    {area}
                                </button>
                            );
                        })}
                    </div>

                    <div style={{ marginBottom: 24 }}>
                        <div style={{ color: '#f5ece1', fontWeight: 600, marginBottom: 8 }}>
                            Resume or experience context (optional)
                        </div>
                        <p style={{ color: '#ab9d90', fontSize: '0.84rem', lineHeight: 1.65, marginBottom: 10 }}>
                            Paste a short resume summary, internship experience, project stack, or the kind of roles
                            you are targeting. Leave it empty if you want a generic interview.
                        </p>
                        <textarea
                            className="input"
                            value={resumeContext}
                            onChange={(e) => setResumeContext(e.target.value.slice(0, 4000))}
                            placeholder="Example: Built MERN and Next.js projects, used MongoDB, REST APIs, JWT auth, and basic deployment. Interested in backend and full-stack roles."
                            style={{ minHeight: 130 }}
                        />
                        <div style={{ color: '#7d7165', fontSize: '0.76rem', marginTop: 6 }}>
                            {resumeContext.length}/4000 characters
                        </div>
                    </div>

                    <div
                        style={{
                            padding: '14px 16px',
                            borderRadius: 12,
                            background: 'rgba(232,130,90,0.05)',
                            border: '1px solid rgba(232,130,90,0.12)',
                            color: '#ab9d90',
                            fontSize: '0.84rem',
                            marginBottom: 24,
                            lineHeight: 1.65,
                        }}
                    >
                        {session
                            ? 'Signed in: your interview will be saved to the dashboard so you can review it later.'
                            : 'Guest mode: your interview will run normally, but the review card is temporary and will be cleared after 15 minutes of inactivity.'}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                        <p style={{ color: '#7d7165', fontSize: '0.82rem' }}>
                            {track === 'repo-viva'
                                ? `${taggedCount} file${taggedCount !== 1 ? 's' : ''} tagged`
                                : `${systemTopics.length} systems topic${systemTopics.length !== 1 ? 's' : ''} selected`}{' '}
                            · {focusAreas.length} area{focusAreas.length !== 1 ? 's' : ''} selected ·{' '}
                            {interviewStyle === 'practice' ? 'practice mode' : 'interview mode'} · {difficultyPreset}
                        </p>
                        <button
                            className="btn-primary"
                            onClick={generateQuestions}
                            disabled={loading || focusAreas.length === 0}
                            style={{ padding: '13px 28px' }}
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="spinner" /> Generating...
                                </>
                            ) : (
                                <>
                                    Generate Interview <ChevronRight size={18} />
                                </>
                            )}
                        </button>
                    </div>
                </div>
            )}
            {/* Full-screen generation overlay — appears when loading=true */}
            <GeneratingOverlay
                isVisible={loading}
                isWakingUp={isWakingUp}
                onWakeRetry={retryGenerate}
            />
        </div>
    );
}