'use client';

/**
 * /interview/[id]/review — Post-interview review page
 * Shows all questions, user answers, AI scores, feedback, and personal notes.
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { ArrowLeft, BookOpen, PlusCircle, Trophy } from 'lucide-react';
import { ISession, Question, Answer } from '@/types';

function ScoreBar({ score }: { score?: number }) {
    if (score === undefined) return <span style={{ color: '#64748b' }}>Not answered</span>;
    const cls = score >= 7 ? 'score-high' : score >= 5 ? 'score-medium' : 'score-low';
    return <div className={`score-ring ${cls}`} style={{ width: 48, height: 48, fontSize: '0.95rem' }}>{score}<span style={{ fontSize: '0.6rem' }}>/10</span></div>;
}

function DiffBadge({ d, label }: { d?: string; label?: string }) {
    if (!d) return null;
    const cls = d === 'Easy' ? 'badge-easy' : d === 'Hard' ? 'badge-hard' : 'badge-medium';
    return <span className={`badge ${cls}`}>{label ?? d}</span>;
}

export default function ReviewPage({ params }: { params: { id: string } }) {
    const { data: authSession, status } = useSession();
    const router = useRouter();
    const [session, setSession] = useState<ISession | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (status === 'unauthenticated') router.push('/');
    }, [status, router]);

    useEffect(() => {
        if (status !== 'authenticated') return;
        fetch(`/api/sessions/${params.id}`)
            .then((r) => r.json())
            .then((data) => { setSession(data); setLoading(false); })
            .catch(() => router.push('/dashboard'));
    }, [params.id, status, router]);

    if (loading || status === 'loading') return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
            <div className="spinner" style={{ width: 40, height: 40 }} />
        </div>
    );
    if (!session) return null;

    const answeredScores = session.answers.filter(a => a.score !== undefined).map(a => a.score!);
    const avgScore = answeredScores.length ? answeredScores.reduce((a, b) => a + b, 0) / answeredScores.length : 0;

    return (
        <div className="page-container" style={{ padding: '32px 24px', maxWidth: 860 }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
                <Link href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#94a3b8', textDecoration: 'none', fontSize: '0.875rem' }}>
                    <ArrowLeft size={15} /> Dashboard
                </Link>
                <Link href="/interview/new" className="btn-secondary" style={{ textDecoration: 'none', fontSize: '0.85rem', padding: '8px 16px' }}>
                    <PlusCircle size={15} /> New Interview
                </Link>
            </div>

            {/* Summary Banner */}
            <div
                className="glass-card"
                style={{
                    padding: '28px 32px', marginBottom: 32,
                    background: 'linear-gradient(135deg, rgba(14,165,233,0.08), rgba(99,102,241,0.08))',
                    display: 'flex', gap: 24, alignItems: 'center', flexWrap: 'wrap',
                }}
            >
                <div style={{ width: 64, height: 64, borderRadius: 16, background: 'linear-gradient(135deg,#0ea5e9,#6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Trophy size={28} color="white" />
                </div>
                <div style={{ flex: 1 }}>
                    <h1 style={{ color: '#e2e8f0', fontWeight: 700, fontSize: '1.4rem', marginBottom: 4 }}>
                        Interview Complete
                    </h1>
                    <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>
                        {session.repoOwner}/{session.repoName} · {session.answers.length} of {session.questions.length} questions answered
                    </p>
                </div>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ color: avgScore >= 7 ? '#34d399' : avgScore >= 5 ? '#fbbf24' : '#f87171', fontSize: '2.2rem', fontWeight: 800 }}>
                        {avgScore.toFixed(1)}
                    </div>
                    <div style={{ color: '#94a3b8', fontSize: '0.8rem' }}>avg score</div>
                </div>
            </div>

            {/* Questions + Answers */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {session.questions.map((q: Question, i: number) => {
                    const ans: Answer | undefined = session.answers.find(a => a.questionIndex === i);
                    const diffCls = q.difficulty === 'Easy' ? 'badge-easy' : q.difficulty === 'Hard' ? 'badge-hard' : 'badge-medium';

                    return (
                        <div key={i} className="glass-card animate-fade-in" style={{ padding: 24 }}>
                            {/* Q header */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, marginBottom: 16 }}>
                                <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8, flexWrap: 'wrap' }}>
                                        <span style={{ color: '#64748b', fontSize: '0.78rem', fontWeight: 600 }}>Q{i + 1}</span>
                                        <span className={`badge ${diffCls}`}>{q.difficulty}</span>
                                        {q.userDifficulty && q.userDifficulty !== q.difficulty && (
                                            <DiffBadge d={q.userDifficulty} label={`felt ${q.userDifficulty}`} />
                                        )}
                                        <span className="badge badge-blue">{q.category}</span>
                                    </div>
                                    <p style={{ color: '#e2e8f0', fontWeight: 500, lineHeight: 1.7 }}>{q.text}</p>
                                </div>
                                <ScoreBar score={ans?.score} />
                            </div>

                            {ans ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                    {/* User Answer */}
                                    <div style={{ padding: '12px 16px', borderRadius: 10, background: 'rgba(15,22,41,0.6)', border: '1px solid rgba(99,179,237,0.1)' }}>
                                        <div style={{ color: '#64748b', fontSize: '0.78rem', marginBottom: 6 }}>Your answer</div>
                                        <p style={{ color: '#cbd5e1', fontSize: '0.88rem', lineHeight: 1.7 }}>{ans.text}</p>
                                    </div>

                                    {/* AI Feedback */}
                                    <div style={{ padding: '12px 16px', borderRadius: 10, background: 'rgba(99,102,241,0.05)', border: '1px solid rgba(99,102,241,0.2)' }}>
                                        <div style={{ color: '#818cf8', fontSize: '0.78rem', marginBottom: 6 }}>AI Feedback</div>
                                        <p style={{ color: '#94a3b8', fontSize: '0.88rem', lineHeight: 1.7 }}>{ans.feedback}</p>
                                    </div>

                                    {/* Model Answer */}
                                    <div style={{ padding: '12px 16px', borderRadius: 10, background: 'rgba(56,189,248,0.05)', border: '1px solid rgba(56,189,248,0.15)' }}>
                                        <div style={{ color: '#38bdf8', fontSize: '0.78rem', marginBottom: 6, display: 'flex', gap: 5, alignItems: 'center' }}>
                                            <BookOpen size={13} /> Model Answer
                                        </div>
                                        <p style={{ color: '#94a3b8', fontSize: '0.88rem', lineHeight: 1.7 }}>{ans.aiAnswer}</p>
                                    </div>

                                    {/* Personal Note */}
                                    {ans.userNote && (
                                        <div style={{ padding: '12px 16px', borderRadius: 10, background: 'rgba(251,191,36,0.05)', border: '1px solid rgba(251,191,36,0.2)' }}>
                                            <div style={{ color: '#fbbf24', fontSize: '0.78rem', marginBottom: 6 }}>📝 Your Note</div>
                                            <p style={{ color: '#e2e8f0', fontSize: '0.88rem', lineHeight: 1.7 }}>{ans.userNote}</p>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div style={{ color: '#64748b', fontSize: '0.85rem', fontStyle: 'italic' }}>Not answered</div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
