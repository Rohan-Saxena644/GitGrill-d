'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn, useSession } from 'next-auth/react';
import {
    AlertCircle,
    Check,
    ChevronRight,
    Chrome,
    GitBranch,
    Github,
    Loader2,
    Tag,
    Target,
} from 'lucide-react';
import { createGuestSession, saveGuestSession } from '@/lib/guest-session';
import { FileTag, FocusArea, GitHubFile, ISession } from '@/types';

const FOCUS_AREAS: FocusArea[] = ['Architecture', 'Error Handling', 'Performance', 'Security'];

const TAG_OPTIONS: { value: FileTag; label: string; color: string }[] = [
    { value: 'untagged', label: 'Skip', color: '#64748b' },
    { value: 'core-logic', label: 'Core Logic', color: '#38bdf8' },
    { value: 'boilerplate', label: 'Boilerplate', color: '#94a3b8' },
    { value: 'config', label: 'Config', color: '#fbbf24' },
    { value: 'tests', label: 'Tests', color: '#34d399' },
];

export default function NewInterviewPage() {
    const { data: session, status } = useSession();
    const router = useRouter();

    const [step, setStep] = useState<1 | 2 | 3>(1);
    const [repoUrl, setRepoUrl] = useState('');
    const [repoOwner, setRepoOwner] = useState('');
    const [repoName, setRepoName] = useState('');
    const [files, setFiles] = useState<GitHubFile[]>([]);
    const [tags, setTags] = useState<Record<string, FileTag>>({});
    const [focusAreas, setFocusAreas] = useState<FocusArea[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    if (status === 'loading') {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
                <div className="spinner" style={{ width: 40, height: 40 }} />
            </div>
        );
    }

    async function fetchFiles() {
        if (loading) return;
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

            const defaultTags: Record<string, FileTag> = {};
            data.files.forEach((file: GitHubFile) => {
                defaultTags[file.path] = 'untagged';
            });
            setTags(defaultTags);
            setStep(2);
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : 'Something went wrong');
        } finally {
            setLoading(false);
        }
    }

    async function generateQuestions() {
        if (loading) return;
        setError('');
        setLoading(true);

        try {
            const taggedFiles = Object.entries(tags)
                .filter(([, tag]) => tag !== 'untagged')
                .map(([path, tag]) => ({ path, tag }));

            if (taggedFiles.length === 0) {
                throw new Error('Please tag at least one file as something other than Skip.');
            }
            if (focusAreas.length === 0) {
                throw new Error('Please select at least one focus area.');
            }

            if (session) {
                const createRes = await fetch('/api/sessions', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ repoUrl, repoOwner, repoName, taggedFiles, focusAreas }),
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
                body: JSON.stringify({ repoOwner, repoName, taggedFiles, focusAreas }),
            });
            const generated = await genRes.json();
            if (!genRes.ok) throw new Error(generated.error ?? 'Failed to generate questions');

            const guestSession = createGuestSession({
                _id: 'guest',
                repoUrl,
                repoOwner,
                repoName,
                taggedFiles: generated.taggedFiles ?? taggedFiles,
                focusAreas,
                questions: generated.questions,
                answers: [],
                status: 'active',
            } as ISession);

            saveGuestSession(guestSession);
            router.push('/interview/guest');
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : 'Something went wrong');
        } finally {
            setLoading(false);
        }
    }

    const taggedCount = Object.values(tags).filter((tag) => tag !== 'untagged').length;

    const stepConfig = [
        { n: 1, label: 'Repo URL', icon: <GitBranch size={14} /> },
        { n: 2, label: 'Tag Files', icon: <Tag size={14} /> },
        { n: 3, label: 'Focus & Generate', icon: <Target size={14} /> },
    ];

    return (
        <div className="page-container" style={{ padding: 'clamp(24px,5vw,48px) 16px', maxWidth: 920 }}>
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
                        <div style={{ color: '#e2e8f0', fontWeight: 600, marginBottom: 4 }}>
                            Guest mode is on
                        </div>
                        <p style={{ color: '#94a3b8', fontSize: '0.86rem', lineHeight: 1.6 }}>
                            You can complete the full 10-question interview without logging in. Guest results are not
                            saved and disappear after 15 minutes of inactivity.
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
                                    color: step >= item.n ? '#e2e8f0' : '#64748b',
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
                                        step > item.n ? 'rgba(56,189,248,0.4)' : 'rgba(99,179,237,0.12)',
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
                        background: 'rgba(248,113,113,0.08)',
                        border: '1px solid rgba(248,113,113,0.25)',
                        color: '#f87171',
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
                    <h2
                        style={{
                            color: '#e2e8f0',
                            fontWeight: 700,
                            fontSize: 'clamp(1.1rem,3vw,1.4rem)',
                            marginBottom: 8,
                        }}
                    >
                        Paste your GitHub repo URL
                    </h2>
                    <p style={{ color: '#94a3b8', marginBottom: 24, fontSize: '0.875rem' }}>
                        Public repositories work best. We read the file list first, then fetch only the tagged files
                        when generating your 10-question practice set.
                    </p>
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                        <input
                            className="input"
                            placeholder="https://github.com/username/repository"
                            value={repoUrl}
                            onChange={(e) => setRepoUrl(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && fetchFiles()}
                            style={{ flex: '1 1 240px', minWidth: 0 }}
                        />
                        <button
                            className="btn-primary"
                            onClick={fetchFiles}
                            disabled={loading || !repoUrl.trim()}
                            style={{ flexShrink: 0, justifyContent: 'center' }}
                        >
                            {loading ? <Loader2 className="spinner" /> : <><ChevronRight size={18} /> Fetch Files</>}
                        </button>
                    </div>
                    <p style={{ color: '#64748b', fontSize: '0.78rem', marginTop: 10 }}>
                        Example: https://github.com/vercel/next.js
                    </p>
                </div>
            )}

            {step === 2 && (
                <div className="animate-fade-in">
                    <div
                        style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'flex-start',
                            marginBottom: 20,
                            gap: 16,
                            flexWrap: 'wrap',
                        }}
                    >
                        <div>
                            <h2
                                style={{
                                    color: '#e2e8f0',
                                    fontWeight: 700,
                                    fontSize: 'clamp(1.1rem,3vw,1.4rem)',
                                    marginBottom: 4,
                                }}
                            >
                                Tag your files
                            </h2>
                            <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>
                                <strong style={{ color: '#e2e8f0' }}>{files.length}</strong> files in{' '}
                                <strong style={{ color: '#38bdf8' }}>
                                    {repoOwner}/{repoName}
                                </strong>
                                . Tag the parts you want the interview to focus on.
                            </p>
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                            <div style={{ color: '#38bdf8', fontWeight: 800, fontSize: '1.6rem', lineHeight: 1 }}>
                                {taggedCount}
                            </div>
                            <div style={{ color: '#64748b', fontSize: '0.72rem', marginTop: 2 }}>tagged</div>
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
                                    borderBottom:
                                        index < files.length - 1 ? '1px solid rgba(99,179,237,0.07)' : 'none',
                                }}
                            >
                                <span
                                    style={{
                                        color: tags[file.path] === 'untagged' ? '#475569' : '#e2e8f0',
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

            {step === 3 && (
                <div className="glass-card animate-fade-in" style={{ padding: 'clamp(20px,5vw,32px)' }}>
                    <h2
                        style={{
                            color: '#e2e8f0',
                            fontWeight: 700,
                            fontSize: 'clamp(1.1rem,3vw,1.4rem)',
                            marginBottom: 8,
                        }}
                    >
                        Choose focus areas
                    </h2>
                    <p style={{ color: '#94a3b8', fontSize: '0.875rem', marginBottom: 24 }}>
                        These guide the interview, but the AI will still keep the set realistic and balanced. You will
                        get 10 MCQ-based questions with explanations built for viva prep.
                    </p>

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
                                        border: active
                                            ? '1px solid rgba(56,189,248,0.6)'
                                            : '1px solid var(--border)',
                                        background: active ? 'rgba(56,189,248,0.08)' : 'rgba(19,29,53,0.4)',
                                        color: active ? '#38bdf8' : '#94a3b8',
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
                                            border: active ? '2px solid #38bdf8' : '2px solid #64748b',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                        }}
                                    >
                                        {active && <Check size={12} color="#38bdf8" />}
                                    </div>
                                    {area}
                                </button>
                            );
                        })}
                    </div>

                    <div
                        style={{
                            padding: '14px 16px',
                            borderRadius: 12,
                            background: 'rgba(56,189,248,0.05)',
                            border: '1px solid rgba(56,189,248,0.12)',
                            color: '#94a3b8',
                            fontSize: '0.84rem',
                            marginBottom: 24,
                            lineHeight: 1.65,
                        }}
                    >
                        {session
                            ? 'Signed in: your interview will be saved to the dashboard so you can review it later.'
                            : 'Guest mode: your interview will run normally, but the question review card is temporary and will be cleared after 15 minutes of inactivity.'}
                    </div>

                    <div
                        style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            flexWrap: 'wrap',
                            gap: 12,
                        }}
                    >
                        <p style={{ color: '#64748b', fontSize: '0.82rem' }}>
                            {taggedCount} file{taggedCount !== 1 ? 's' : ''} tagged · {focusAreas.length} area
                            {focusAreas.length !== 1 ? 's' : ''} selected
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
                                    Generate 10 Questions <ChevronRight size={18} />
                                </>
                            )}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
