'use client';

import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { PlusCircle, GitBranch, Clock, CheckCircle2, Loader2, Trash2, BarChart2 } from 'lucide-react';
import { ISession } from '@/types';

function ScoreBadge({ avg }: { avg: number }) {
  const cls = avg >= 7 ? 'score-high' : avg >= 5 ? 'score-medium' : 'score-low';
  return (
    <div className={`score-ring ${cls}`} style={{ width: 48, height: 48, fontSize: '1rem' }}>
      {avg > 0 ? avg.toFixed(1) : '–'}
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, { label: string; color: string }> = {
    draft:     { label: 'Draft',       color: '#64748b' },
    active:    { label: 'In Progress', color: '#fbbf24' },
    completed: { label: 'Completed',   color: '#34d399' },
  };
  const { label, color } = map[status] ?? map.draft;
  return (
    <span style={{
      fontSize: '0.72rem', fontWeight: 600, color,
      background: `${color}18`, border: `1px solid ${color}35`,
      padding: '3px 10px', borderRadius: 20,
    }}>
      {label}
    </span>
  );
}

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [sessions, setSessions]   = useState<ISession[]>([]);
  const [loading, setLoading]     = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/');
  }, [status, router]);

  useEffect(() => {
    if (status !== 'authenticated') return;
    fetch('/api/sessions')
      .then((r) => r.json())
      .then((data) => { setSessions(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [status]);

  async function handleDelete(id: string) {
    if (!confirm('Delete this session?')) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/sessions/${id}`, { method: 'DELETE' });
      if (res.ok) setSessions((prev) => prev.filter((s) => s._id !== id));
      else alert('Failed to delete session');
    } catch { alert('Error deleting session'); }
    finally { setDeletingId(null); }
  }

  if (status === 'loading' || loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
      <div className="spinner" style={{ width: 40, height: 40 }} />
    </div>
  );

  const avgScore = (s: ISession) => {
    const scores = s.answers.filter((a) => a.score !== undefined).map((a) => a.score!);
    return scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
  };

  // Stats
  const completed  = sessions.filter((s) => s.status === 'completed').length;
  const inProgress = sessions.filter((s) => s.status === 'active').length;
  const allScores  = sessions.flatMap((s) => s.answers.filter((a) => a.score !== undefined).map((a) => a.score!));
  const overallAvg = allScores.length ? allScores.reduce((a, b) => a + b, 0) / allScores.length : 0;

  return (
    <div style={{ minHeight: '100vh' }}>
      <div className="page-container" style={{ padding: 'clamp(24px,5vw,48px) 16px' }}>

        {/* ── Header ── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32, flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h1 style={{ fontSize: 'clamp(1.4rem,4vw,1.9rem)', fontWeight: 700, color: '#e2e8f0', marginBottom: 4 }}>
              Your Interviews
            </h1>
            <p style={{ color: '#94a3b8', fontSize: '0.875rem' }}>
              Welcome back, <strong style={{ color: '#e2e8f0' }}>{session?.user?.name}</strong>
            </p>
          </div>
          <Link href="/interview/new" className="btn-primary" style={{ textDecoration: 'none' }}>
            <PlusCircle size={17} /> New Interview
          </Link>
        </div>

        {/* ── Stats Row ── */}
        {sessions.length > 0 && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
            gap: 12, marginBottom: 32,
          }}>
            {[
              { label: 'Total Sessions',  value: sessions.length,         color: '#38bdf8' },
              { label: 'Completed',       value: completed,               color: '#34d399' },
              { label: 'In Progress',     value: inProgress,              color: '#fbbf24' },
              { label: 'Avg Score',       value: overallAvg > 0 ? overallAvg.toFixed(1) : '—', color: overallAvg >= 7 ? '#34d399' : overallAvg >= 5 ? '#fbbf24' : '#f87171' },
            ].map((stat) => (
              <div key={stat.label} style={{
                background: 'rgba(19,29,53,0.5)', border: '1px solid var(--border)',
                borderRadius: 12, padding: '16px 20px',
              }}>
                <div style={{ fontSize: 'clamp(1.4rem,3vw,1.8rem)', fontWeight: 800, color: stat.color, lineHeight: 1 }}>
                  {stat.value}
                </div>
                <div style={{ color: '#64748b', fontSize: '0.78rem', marginTop: 4 }}>{stat.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* ── Empty State ── */}
        {sessions.length === 0 ? (
          <div className="glass-card" style={{ padding: 'clamp(40px,8vw,80px) clamp(20px,5vw,40px)', textAlign: 'center' }}>
            <div style={{
              width: 64, height: 64, borderRadius: 16,
              background: 'rgba(56,189,248,0.06)', border: '1px solid rgba(56,189,248,0.18)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 20px', color: '#38bdf8',
            }}>
              <GitBranch size={28} />
            </div>
            <h2 style={{ color: '#e2e8f0', fontWeight: 600, marginBottom: 8 }}>No interviews yet</h2>
            <p style={{ color: '#94a3b8', marginBottom: 28, fontSize: '0.9rem', maxWidth: 360, margin: '0 auto 28px' }}>
              Paste a GitHub repo URL to get your first AI-generated interview questions.
            </p>
            <Link href="/interview/new" className="btn-primary" style={{ textDecoration: 'none' }}>
              Start First Interview
            </Link>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 320px), 1fr))',
            gap: 16,
          }}>
            {sessions.map((s) => {
              const score = avgScore(s);
              const date  = new Date(s.createdAt!).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
              const href  = s.status === 'completed' ? `/interview/${s._id}/review` : `/interview/${s._id}`;
              const answeredPct = s.questions.length > 0 ? Math.round((s.answers.length / s.questions.length) * 100) : 0;

              return (
                <div key={s._id} style={{ position: 'relative' }}>
                  {/* Delete button */}
                  <button
                    onClick={() => handleDelete(s._id!)}
                    disabled={deletingId === s._id}
                    style={{
                      position: 'absolute', top: 14, right: 14, zIndex: 10,
                      background: 'rgba(239,68,68,0.08)', color: '#ef4444',
                      border: '1px solid rgba(239,68,68,0.25)', borderRadius: 8,
                      padding: '6px', cursor: deletingId === s._id ? 'not-allowed' : 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'all 0.2s', outline: 'none',
                    }}
                    title="Delete session"
                  >
                    {deletingId === s._id ? <Loader2 size={15} className="spinner" /> : <Trash2 size={15} />}
                  </button>

                  <Link href={href} style={{ textDecoration: 'none', display: 'block' }}>
                    <div className="glass-card" style={{ padding: '22px', cursor: 'pointer', height: '100%' }}>
                      {/* Repo name */}
                      <div style={{ paddingRight: 36, marginBottom: 14 }}>
                        <div style={{ fontWeight: 700, color: '#e2e8f0', fontSize: '1rem', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {s.repoName}
                        </div>
                        <div style={{ color: '#64748b', fontSize: '0.78rem' }}>{s.repoOwner}</div>
                      </div>

                      {/* Status + answered */}
                      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
                        <StatusPill status={s.status} />
                        <span style={{ color: '#64748b', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <CheckCircle2 size={12} />
                          {s.answers.length}/{s.questions.length} answered
                        </span>
                      </div>

                      {/* Progress bar */}
                      {s.questions.length > 0 && (
                        <div style={{ marginBottom: 16 }}>
                          <div style={{ height: 4, background: 'rgba(99,179,237,0.1)', borderRadius: 2, overflow: 'hidden' }}>
                            <div style={{
                              height: '100%', borderRadius: 2,
                              width: `${answeredPct}%`,
                              background: s.status === 'completed'
                                ? 'linear-gradient(90deg, #34d399, #0ea5e9)'
                                : 'linear-gradient(90deg, #0ea5e9, #6366f1)',
                              transition: 'width 0.4s',
                            }} />
                          </div>
                        </div>
                      )}

                      {/* Footer */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#64748b', fontSize: '0.78rem' }}>
                          <Clock size={12} /> {date}
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
    </div>
  );
}