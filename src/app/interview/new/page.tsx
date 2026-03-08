'use client';

/**
 * /interview/new — Multi-step new interview setup
 *
 * Step 1: Paste GitHub repo URL → fetch file list
 * Step 2: Tag files (Core Logic / Boilerplate / Config / Tests)
 * Step 3: Pick focus areas → Generate questions → go to interview
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession, signIn } from 'next-auth/react';
import { GitBranch, Tag, Target, Loader2, ChevronRight, Check, AlertCircle } from 'lucide-react';
import { GitHubFile, FileTag, FocusArea } from '@/types';

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

    if (status === 'loading') return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
            <div className="spinner" style={{ width: 40, height: 40 }} />
        </div>
    );

    if (!session) return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
            <div className="glass-card" style={{ padding: 40, textAlign: 'center', maxWidth: 360 }}>
                <h2 style={{ color: '#e2e8f0', marginBottom: 12 }}>Sign in required</h2>
                <p style={{ color: '#94a3b8', marginBottom: 24 }}>You need to sign in with GitHub to start an interview.</p>
                <button className="btn-primary" onClick={() => signIn('github')}>Sign in with GitHub</button>
            </div>
        </div>
    );

    // ── Step 1: Fetch file list ──
    async function fetchFiles() {
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
            // Default all files as untagged
            const defaultTags: Record<string, FileTag> = {};
            data.files.forEach((f: GitHubFile) => { defaultTags[f.path] = 'untagged'; });
            setTags(defaultTags);
            setStep(2);
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : 'Something went wrong');
        } finally {
            setLoading(false);
        }
    }

    // ── Step 3: Create session + generate questions ──
    async function generateQuestions() {
        setError('');
        setLoading(true);
        try {
            const taggedFiles = Object.entries(tags)
                .filter(([, tag]) => tag !== 'untagged')
                .map(([path, tag]) => ({ path, tag }));

            if (taggedFiles.length === 0) throw new Error('Please tag at least one file as something other than Skip.');
            if (focusAreas.length === 0) throw new Error('Please select at least one focus area.');

            // Create session in MongoDB
            const createRes = await fetch('/api/sessions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ repoUrl, repoOwner, repoName, taggedFiles, focusAreas }),
            });
            const sess = await createRes.json();
            if (!createRes.ok) throw new Error(sess.error ?? 'Failed to create session');

            // Generate questions via Gemini
            const genRes = await fetch('/api/ai/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sessionId: sess._id }),
            });
            const genData = await genRes.json();
            if (!genRes.ok) throw new Error(genData.error ?? 'Failed to generate questions');

            router.push(`/interview/${sess._id}`);
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : 'Something went wrong');
        } finally {
            setLoading(false);
        }
    }

    const taggedCount = Object.values(tags).filter((t) => t !== 'untagged').length;

    return (
        <div className="page-container" style={{ padding: '48px 24px', maxWidth: 860 }}>
            {/* Step indicator */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 40 }}>
                {[
                    { n: 1, label: 'Repo URL', icon: <GitBranch size={14} /> },
                    { n: 2, label: 'Tag Files', icon: <Tag size={14} /> },
                    { n: 3, label: 'Focus & Generate', icon: <Target size={14} /> },
                ].map((s, i) => (
                    <div key={s.n} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
                            <div
                                className={
                                    step > s.n ? 'step-dot step-dot-done' :
                                        step === s.n ? 'step-dot step-dot-active' :
                                            'step-dot step-dot-idle'
                                }
                            >
                                {step > s.n ? <Check size={14} /> : s.n}
                            </div>
                            <span style={{ fontSize: '0.85rem', fontWeight: 500, color: step >= s.n ? '#e2e8f0' : '#64748b' }}>
                                {s.label}
                            </span>
                        </div>
                        {i < 2 && (
                            <div style={{ width: 32, height: 1, background: step > s.n + 0 ? 'rgba(56,189,248,0.5)' : 'rgba(99,179,237,0.15)', margin: '0 8px' }} />
                        )}
                    </div>
                ))}
            </div>

            {/* Error */}
            {error && (
                <div style={{ padding: '12px 16px', borderRadius: 10, background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)', color: '#f87171', display: 'flex', gap: 10, alignItems: 'center', marginBottom: 24 }}>
                    <AlertCircle size={16} />
                    {error}
                </div>
            )}

            {/* ── STEP 1: Repo URL ── */}
            {step === 1 && (
                <div className="glass-card animate-fade-in" style={{ padding: 32 }}>
                    <h2 style={{ color: '#e2e8f0', fontWeight: 700, fontSize: '1.4rem', marginBottom: 8 }}>
                        Paste your GitHub repo URL
                    </h2>
                    <p style={{ color: '#94a3b8', marginBottom: 24, fontSize: '0.9rem' }}>
                        Must be a public repository. We&apos;ll read the file list but not retrieve content until question generation.
                    </p>
                    <div style={{ display: 'flex', gap: 12 }}>
                        <input
                            className="input"
                            placeholder="https://github.com/username/repository"
                            value={repoUrl}
                            onChange={(e) => setRepoUrl(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && fetchFiles()}
                        />
                        <button
                            className="btn-primary"
                            onClick={fetchFiles}
                            disabled={loading || !repoUrl.trim()}
                            style={{ flexShrink: 0 }}
                        >
                            {loading ? <div className="spinner" /> : <><ChevronRight size={18} /> Fetch Files</>}
                        </button>
                    </div>
                    <p style={{ color: '#64748b', fontSize: '0.8rem', marginTop: 12 }}>
                        Example: https://github.com/vercel/next.js
                    </p>
                </div>
            )}

            {/* ── STEP 2: Tag Files ── */}
            {step === 2 && (
                <div className="animate-fade-in">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                        <div>
                            <h2 style={{ color: '#e2e8f0', fontWeight: 700, fontSize: '1.4rem', marginBottom: 4 }}>
                                Tag your files
                            </h2>
                            <p style={{ color: '#94a3b8', fontSize: '0.88rem' }}>
                                {files.length} files found in <strong style={{ color: '#38bdf8' }}>{repoOwner}/{repoName}</strong>.
                                Tag the files you want AI to focus on. Skip unimportant ones.
                            </p>
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                            <div style={{ color: '#38bdf8', fontWeight: 700, fontSize: '1.4rem' }}>{taggedCount}</div>
                            <div style={{ color: '#94a3b8', fontSize: '0.75rem' }}>tagged</div>
                        </div>
                    </div>

                    {/* Legend */}
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
                        {TAG_OPTIONS.map((t) => (
                            <span key={t.value} style={{ fontSize: '0.75rem', padding: '3px 10px', borderRadius: 20, color: t.color, background: `${t.color}18`, border: `1px solid ${t.color}40` }}>
                                {t.label}
                            </span>
                        ))}
                    </div>

                    <div className="glass-card" style={{ padding: 0, maxHeight: '55vh', overflowY: 'auto' }}>
                        {files.map((f, i) => (
                            <div
                                key={f.path}
                                style={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
                                    padding: '10px 16px',
                                    borderBottom: i < files.length - 1 ? '1px solid rgba(99,179,237,0.08)' : 'none',
                                }}
                            >
                                <span style={{ color: tags[f.path] === 'untagged' ? '#64748b' : '#e2e8f0', fontSize: '0.82rem', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {f.path}
                                </span>
                                <select
                                    value={tags[f.path] ?? 'untagged'}
                                    onChange={(e) => setTags({ ...tags, [f.path]: e.target.value as FileTag })}
                                    style={{
                                        background: 'var(--bg-secondary)', color: 'var(--text-primary)',
                                        border: '1px solid var(--border)', borderRadius: 6, padding: '4px 8px',
                                        fontSize: '0.8rem', cursor: 'pointer', flexShrink: 0, outline: 'none',
                                    }}
                                >
                                    {TAG_OPTIONS.map((t) => (
                                        <option key={t.value} value={t.value}>{t.label}</option>
                                    ))}
                                </select>
                            </div>
                        ))}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
                        <button
                            className="btn-primary"
                            disabled={taggedCount === 0}
                            onClick={() => setStep(3)}
                        >
                            Continue <ChevronRight size={18} />
                        </button>
                    </div>
                </div>
            )}

            {/* ── STEP 3: Focus Areas + Generate ── */}
            {step === 3 && (
                <div className="glass-card animate-fade-in" style={{ padding: 32 }}>
                    <h2 style={{ color: '#e2e8f0', fontWeight: 700, fontSize: '1.4rem', marginBottom: 8 }}>
                        Choose focus areas
                    </h2>
                    <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: 24 }}>
                        The AI will prioritize questions in these categories. Select at least one.
                    </p>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 32 }}>
                        {FOCUS_AREAS.map((area) => {
                            const active = focusAreas.includes(area);
                            return (
                                <button
                                    key={area}
                                    onClick={() =>
                                        setFocusAreas(
                                            active ? focusAreas.filter((a) => a !== area) : [...focusAreas, area]
                                        )
                                    }
                                    style={{
                                        padding: '16px 20px',
                                        borderRadius: 12,
                                        border: active ? '1px solid rgba(56,189,248,0.6)' : '1px solid var(--border)',
                                        background: active ? 'rgba(56,189,248,0.08)' : 'transparent',
                                        color: active ? '#38bdf8' : '#94a3b8',
                                        fontWeight: active ? 600 : 400,
                                        cursor: 'pointer',
                                        textAlign: 'left',
                                        fontSize: '0.95rem',
                                        transition: 'all 0.15s',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 10,
                                    }}
                                >
                                    <div
                                        style={{
                                            width: 20, height: 20, borderRadius: 6,
                                            border: active ? '2px solid #38bdf8' : '2px solid #64748b',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            flexShrink: 0,
                                        }}
                                    >
                                        {active && <Check size={12} color="#38bdf8" />}
                                    </div>
                                    {area}
                                </button>
                            );
                        })}
                    </div>

                    <div style={{ display: 'flex', gap: 12, justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
                        <p style={{ color: '#64748b', fontSize: '0.85rem' }}>
                            {taggedCount} file{taggedCount !== 1 ? 's' : ''} tagged · {focusAreas.length} area{focusAreas.length !== 1 ? 's' : ''} selected
                        </p>
                        <button
                            className="btn-primary"
                            onClick={generateQuestions}
                            disabled={loading || focusAreas.length === 0}
                            style={{ padding: '14px 28px' }}
                        >
                            {loading ? (
                                <><div className="spinner" /> Generating…</>
                            ) : (
                                <>Generate Questions <ChevronRight size={18} /></>
                            )}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
