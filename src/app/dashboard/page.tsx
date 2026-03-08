'use client';

import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { PlusCircle, GitBranch, Clock, CheckCircle2, Loader2, Trash2 } from 'lucide-react';
import { ISession } from '@/types';

function ScoreBadge({ avg }: { avg: number }) {
    const cls = avg >= 7 ? 'score-high' : avg >= 5 ? 'score-medium' : 'score-low';
    return (
        <div className={`score-ring ${cls}`} style={{ width: 48, height: 48, fontSize: '1rem' }}>
            {avg > 0 ? avg.toFixed(1) : '–'}
        </div>
    );
}

function StatusBadge({ status }: { status: string }) {
    const map: Record<string, { label: string; color: string }> = {
        draft: { label: 'Draft', color: '#64748b' },
        active: { label: 'In Progress', color: '#fbbf24' },
        completed: { label: 'Completed', color: '#34d399' },
    };
    const { label, color } = map[status] ?? map.draft;
    return (
        <span
            style={{
                fontSize: '0.75rem', fontWeight: 600, color,
                background: `${color}18`, border: `1px solid ${color}40`,
                padding: '3px 10px', borderRadius: 20,
            }}
        >
            {label}
        </span>
    );
}

export default function DashboardPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [sessions, setSessions] = useState<ISession[]>([]);
    const [loading, setLoading] = useState(true);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    async function handleDelete(id: string) {
        if (!confirm('Are you sure you want to delete this session?')) return;
        setDeletingId(id);
        try {
            const res = await fetch(`/api/sessions/${id}`, { method: 'DELETE' });
            if (res.ok) {
                setSessions((prev) => prev.filter((s) => s._id !== id));
            } else {
                alert('Failed to delete session');
            }
        } catch (e) {
            alert('Error deleting session');
        } finally {
            setDeletingId(null);
        }
    }

    // Redirect if not logged in
    useEffect(() => {
        if (status === 'unauthenticated') router.push('/');
    }, [status, router]);

    useEffect(() => {
        if (status !== 'authenticated') return;
        fetch('/api/sessions')
            .then((r) => r.json())
            .then((data) => {
                setSessions(Array.isArray(data) ? data : []);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, [status]);

    if (status === 'loading' || loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
                <div className="spinner" style={{ width: 40, height: 40 }} />
            </div>
        );
    }

    const avgScore = (s: ISession) => {
        const scores = s.answers.filter((a) => a.score !== undefined).map((a) => a.score!);
        return scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
    };

    return (
        <div className="page-container" style={{ padding: '48px 24px' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 40, flexWrap: 'wrap', gap: 16 }}>
                <div>
                    <h1 style={{ fontSize: '1.9rem', fontWeight: 700, color: '#e2e8f0', marginBottom: 6 }}>
                        Your Interviews
                    </h1>
                    <p style={{ color: '#94a3b8' }}>
                        Welcome back, <strong style={{ color: '#e2e8f0' }}>{session?.user?.name}</strong>
                        {' '}— {sessions.length} session{sessions.length !== 1 ? 's' : ''} total
                    </p>
                </div>
                <Link href="/interview/new" className="btn-primary" style={{ textDecoration: 'none' }}>
                    <PlusCircle size={18} />
                    New Interview
                </Link>
            </div>

            {/* Empty State */}
            {sessions.length === 0 ? (
                <div
                    className="glass-card"
                    style={{ padding: '80px 40px', textAlign: 'center' }}
                >
                    <div style={{ width: 64, height: 64, borderRadius: 16, background: 'rgba(56,189,248,0.08)', border: '1px solid rgba(56,189,248,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', color: '#38bdf8' }}>
                        <GitBranch size={28} />
                    </div>
                    <h2 style={{ color: '#e2e8f0', fontWeight: 600, marginBottom: 8 }}>No interviews yet</h2>
                    <p style={{ color: '#94a3b8', marginBottom: 28 }}>Paste a GitHub repo URL to get your first AI-generated interview questions.</p>
                    <Link href="/interview/new" className="btn-primary" style={{ textDecoration: 'none' }}>
                        Start First Interview
                    </Link>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 20 }}>
                    {sessions.map((s) => {
                        const score = avgScore(s);
                        const date = new Date(s.createdAt!).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                        const href = s.status === 'completed' ? `/interview/${s._id}/review` : `/interview/${s._id}`;
                        return (
                            <div key={s._id} style={{ position: 'relative' }}>
                                <button
                                    onClick={() => handleDelete(s._id!)}
                                    disabled={deletingId === s._id}
                                    style={{
                                        position: 'absolute', top: 16, right: 16, zIndex: 10,
                                        background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444',
                                        border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: 8,
                                        padding: 8, cursor: deletingId === s._id ? 'not-allowed' : 'pointer',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        transition: 'all 0.2s', outline: 'none'
                                    }}
                                    title="Delete session"
                                >
                                    {deletingId === s._id ? <Loader2 size={16} className="spinner" /> : <Trash2 size={16} />}
                                </button>
                                <Link
                                    href={href}
                                    style={{ textDecoration: 'none', display: 'block', height: '100%' }}
                                >
                                    <div className="glass-card" style={{ padding: '24px', cursor: 'pointer', height: '100%' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                                            <div style={{ minWidth: 0, paddingRight: 40 }}>
                                                <div style={{ fontWeight: 700, color: '#e2e8f0', fontSize: '1.05rem', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                    {s.repoName}
                                                </div>
                                                <div style={{ color: '#64748b', fontSize: '0.8rem' }}>{s.repoOwner}</div>
                                            </div>
                                            {/* Moved score badge to bottom layout below to not clash with delete button */}
                                        </div>

                                        <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
                                            <StatusBadge status={s.status} />
                                            <span style={{ color: '#64748b', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 4 }}>
                                                <CheckCircle2 size={13} />
                                                {s.answers.length}/{s.questions.length} answered
                                            </span>
                                        </div>

                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#64748b', fontSize: '0.8rem' }}>
                                                <Clock size={13} />
                                                {date}
                                            </div>
                                            <ScoreBadge avg={score} />
                                        </div>
                                    </div>
                                </Link>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
