'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { AlertCircle, ArrowLeft, BookOpen, CheckCircle, ChevronRight, Star } from 'lucide-react';
import { clearGuestSession, readGuestSession, saveGuestSession, touchGuestSession } from '@/lib/guest-session';
import { Answer, Difficulty, GuestSessionState, ISession, Question } from '@/types';

type EvaluationResult = {
    score: number;
    feedback: string;
    aiAnswer: string;
    isCorrect: boolean;
    correctAnswerIndex: number;
};

const DIFFICULTY_OPTIONS: Difficulty[] = ['Easy', 'Medium', 'Hard'];

function DiffBadge({ difficulty }: { difficulty?: string }) {
    if (!difficulty) return null;
    const cls =
        difficulty === 'Easy' ? 'badge-easy' : difficulty === 'Hard' ? 'badge-hard' : 'badge-medium';
    return <span className={`badge ${cls}`}>{difficulty}</span>;
}

function ScoreDisplay({ score }: { score: number }) {
    const cls = score >= 7 ? 'score-high' : score >= 5 ? 'score-medium' : 'score-low';
    return (
        <div className={`score-ring ${cls}`}>
            {score}
            <span style={{ fontSize: '0.65rem' }}>/10</span>
        </div>
    );
}

export default function InterviewWorkspace({
    mode,
    sessionId,
}: {
    mode: 'saved' | 'guest';
    sessionId?: string;
}) {
    const { status } = useSession();
    const router = useRouter();

    const [session, setSession] = useState<ISession | GuestSessionState | null>(null);
    const [currentQ, setCurrentQ] = useState(0);
    const [selectedOptionIndex, setSelectedOptionIndex] = useState<number | null>(null);
    const [note, setNote] = useState('');
    const [userDiff, setUserDiff] = useState<Difficulty | ''>('');
    const [evaluation, setEvaluation] = useState<EvaluationResult | null>(null);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [pageLoading, setPageLoading] = useState(true);

    useEffect(() => {
        if (mode === 'saved' && status === 'unauthenticated') {
            router.push('/');
        }
    }, [mode, router, status]);

    useEffect(() => {
        if (mode === 'saved') {
            if (status !== 'authenticated' || !sessionId) return;

            fetch(`/api/sessions/${sessionId}`)
                .then((response) => response.json())
                .then((data) => {
                    if (data.error) {
                        router.push('/dashboard');
                        return;
                    }
                    if (data.status === 'completed') {
                        router.push(`/interview/${sessionId}/review`);
                        return;
                    }
                    setSession(data);
                    setCurrentQ(data.answers.length);
                    setPageLoading(false);
                })
                .catch(() => {
                    router.push('/dashboard');
                });
            return;
        }

        const guestSession = readGuestSession();
        if (!guestSession) {
            router.push('/interview/new');
            return;
        }
        touchGuestSession();
        setSession(guestSession);
        setCurrentQ(guestSession.answers.length);
        setPageLoading(false);
    }, [mode, router, sessionId, status]);

    const totalQ = session?.questions.length ?? 0;
    const question = useMemo(() => {
        if (!session?.questions.length) return null;
        return session.questions[currentQ];
    }, [currentQ, session]);

    if ((mode === 'saved' && status === 'loading') || pageLoading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
                <div className="spinner" style={{ width: 40, height: 40 }} />
            </div>
        );
    }

    if (!session || !question || !totalQ) return null;

    const progress = (currentQ / totalQ) * 100;

    async function submitAnswer() {
        if (selectedOptionIndex === null) return;

        setError('');
        setLoading(true);
        try {
            const response = await fetch('/api/ai/evaluate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ question, selectedOptionIndex }),
            });
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error ?? 'Evaluation failed');
            }
            setEvaluation(data);
            if (mode === 'guest') {
                touchGuestSession();
            }
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : 'Something went wrong');
        } finally {
            setLoading(false);
        }
    }

    async function saveAndNext() {
        if (!session || !evaluation || selectedOptionIndex === null) return;

        setSaving(true);

        const newAnswer: Answer = {
            questionIndex: currentQ,
            selectedOptionIndex,
            isCorrect: evaluation.isCorrect,
            score: evaluation.score,
            feedback: evaluation.feedback,
            aiAnswer: evaluation.aiAnswer,
            userNote: note,
        };

        const updatedQuestions = [...session.questions];
        if (userDiff) {
            updatedQuestions[currentQ] = { ...updatedQuestions[currentQ], userDifficulty: userDiff };
        }

        const updatedAnswers = [...session.answers, newAnswer];
        const isLast = currentQ >= totalQ - 1;
        const updatedSession = {
            ...session,
            answers: updatedAnswers,
            questions: updatedQuestions,
            status: isLast ? 'completed' : 'active',
        } as ISession | GuestSessionState;

        try {
            if (mode === 'saved' && sessionId) {
                await fetch(`/api/sessions/${sessionId}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        answers: updatedAnswers,
                        questions: updatedQuestions,
                        status: isLast ? 'completed' : 'active',
                    }),
                });
            } else {
                const guestSession = {
                    ...(updatedSession as GuestSessionState),
                    lastActiveAt: Date.now(),
                    expiresAt: Date.now() + 15 * 60 * 1000,
                };
                saveGuestSession(guestSession);
                if (isLast) {
                    touchGuestSession();
                }
            }

            if (isLast) {
                router.push(mode === 'saved' ? `/interview/${sessionId}/review` : '/interview/guest/review');
                return;
            }

            setSession(updatedSession);
            setCurrentQ(currentQ + 1);
            setSelectedOptionIndex(null);
            setNote('');
            setUserDiff('');
            setEvaluation(null);
            setSaving(false);
        } catch {
            setError('Failed to save your answer');
            setSaving(false);
        }
    }

    const backHref = mode === 'saved' ? '/dashboard' : '/interview/new';

    return (
        <div className="page-container" style={{ padding: '32px 24px', maxWidth: 860 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <Link
                    href={backHref}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        color: '#94a3b8',
                        textDecoration: 'none',
                        fontSize: '0.875rem',
                    }}
                >
                    <ArrowLeft size={15} /> {mode === 'saved' ? 'Dashboard' : 'Back'}
                </Link>
                <span style={{ color: '#94a3b8', fontSize: '0.875rem' }}>
                    {session.repoOwner}/{session.repoName}
                </span>
            </div>

            <div style={{ marginBottom: 32 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <span style={{ color: '#94a3b8', fontSize: '0.82rem' }}>
                        Question {currentQ + 1} of {totalQ}
                    </span>
                    <span style={{ color: '#38bdf8', fontSize: '0.82rem', fontWeight: 600 }}>
                        {Math.round(progress)}% complete
                    </span>
                </div>
                <div
                    style={{
                        height: 6,
                        background: 'rgba(99,179,237,0.12)',
                        borderRadius: 3,
                        overflow: 'hidden',
                    }}
                >
                    <div
                        style={{
                            height: '100%',
                            width: `${progress}%`,
                            background: 'linear-gradient(90deg, #0ea5e9, #6366f1)',
                            borderRadius: 3,
                            transition: 'width 0.4s',
                        }}
                    />
                </div>
            </div>

            <div className="glass-card animate-fade-in" style={{ padding: 28, marginBottom: 20 }}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
                    <span className="badge badge-blue">{question.category}</span>
                    <DiffBadge difficulty={question.difficulty} />
                    {mode === 'guest' && (
                        <span className="badge" style={{ background: 'rgba(251,191,36,0.12)', color: '#fbbf24' }}>
                            Guest session
                        </span>
                    )}
                </div>
                <p style={{ color: '#e2e8f0', fontSize: '1.05rem', lineHeight: 1.75, fontWeight: 500 }}>
                    {question.text}
                </p>
            </div>

            {!evaluation && (
                <div className="glass-card animate-fade-in" style={{ padding: 24, marginBottom: 16 }}>
                    <label style={{ color: '#94a3b8', fontSize: '0.85rem', display: 'block', marginBottom: 12 }}>
                        Pick the best answer
                    </label>
                    <div style={{ display: 'grid', gap: 12 }}>
                        {question.options.map((option, index) => {
                            const active = selectedOptionIndex === index;
                            return (
                                <button
                                    key={`${index}-${option}`}
                                    onClick={() => setSelectedOptionIndex(index)}
                                    style={{
                                        padding: '14px 16px',
                                        borderRadius: 12,
                                        border: active
                                            ? '1px solid rgba(56,189,248,0.6)'
                                            : '1px solid var(--border)',
                                        background: active ? 'rgba(56,189,248,0.08)' : 'rgba(15,22,41,0.65)',
                                        color: active ? '#e2e8f0' : '#94a3b8',
                                        textAlign: 'left',
                                        cursor: 'pointer',
                                        transition: 'all 0.15s',
                                    }}
                                >
                                    <div style={{ display: 'flex', gap: 12 }}>
                                        <span
                                            style={{
                                                color: active ? '#38bdf8' : '#64748b',
                                                fontWeight: 700,
                                                minWidth: 18,
                                            }}
                                        >
                                            {String.fromCharCode(65 + index)}.
                                        </span>
                                        <span style={{ lineHeight: 1.65 }}>{option}</span>
                                    </div>
                                </button>
                            );
                        })}
                    </div>

                    {error && (
                        <div
                            style={{
                                marginTop: 10,
                                color: '#f87171',
                                fontSize: '0.85rem',
                                display: 'flex',
                                gap: 6,
                                alignItems: 'center',
                            }}
                        >
                            <AlertCircle size={14} /> {error}
                        </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 14 }}>
                        <button
                            className="btn-primary"
                            onClick={submitAnswer}
                            disabled={loading || selectedOptionIndex === null}
                            style={{ padding: '11px 24px' }}
                        >
                            {loading ? (
                                <>
                                    <div className="spinner" /> Checking...
                                </>
                            ) : (
                                <>
                                    Submit Answer <ChevronRight size={16} />
                                </>
                            )}
                        </button>
                    </div>
                </div>
            )}

            {evaluation && selectedOptionIndex !== null && (
                <div className="animate-slide-up">
                    <div className="glass-card" style={{ padding: 24, marginBottom: 16 }}>
                        <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', marginBottom: 20 }}>
                            <ScoreDisplay score={evaluation.score} />
                            <div>
                                <div style={{ color: '#e2e8f0', fontWeight: 600, marginBottom: 8 }}>
                                    {evaluation.isCorrect ? 'You got it right' : 'You can tighten this answer'}
                                </div>
                                <p style={{ color: '#94a3b8', lineHeight: 1.7, fontSize: '0.9rem' }}>
                                    {evaluation.feedback}
                                </p>
                            </div>
                        </div>
                        <div
                            style={{
                                padding: 16,
                                borderRadius: 10,
                                background: 'rgba(56,189,248,0.05)',
                                border: '1px solid rgba(56,189,248,0.15)',
                            }}
                        >
                            <div
                                style={{
                                    color: '#38bdf8',
                                    fontWeight: 600,
                                    fontSize: '0.85rem',
                                    marginBottom: 8,
                                    display: 'flex',
                                    gap: 6,
                                }}
                            >
                                <BookOpen size={15} /> Interview-ready explanation
                            </div>
                            <p style={{ color: '#94a3b8', lineHeight: 1.75, fontSize: '0.88rem' }}>
                                {evaluation.aiAnswer}
                            </p>
                        </div>
                    </div>

                    <div className="glass-card" style={{ padding: 20, marginBottom: 16 }}>
                        <div style={{ color: '#64748b', fontSize: '0.8rem', marginBottom: 6 }}>Your selection</div>
                        <p style={{ color: '#cbd5e1', fontSize: '0.88rem', lineHeight: 1.7 }}>
                            {String.fromCharCode(65 + selectedOptionIndex)}. {question.options[selectedOptionIndex]}
                        </p>
                    </div>

                    <div className="glass-card" style={{ padding: 24, marginBottom: 20 }}>
                        <label style={{ color: '#94a3b8', fontSize: '0.85rem', display: 'block', marginBottom: 6 }}>
                            Add your own note or correction (optional)
                        </label>
                        <textarea
                            className="input"
                            placeholder="What did you miss? What would you say in a viva? Capture the corrected thought here."
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            style={{ minHeight: 90 }}
                        />

                        <div style={{ marginTop: 16 }}>
                            <div
                                style={{
                                    color: '#94a3b8',
                                    fontSize: '0.85rem',
                                    marginBottom: 8,
                                    display: 'flex',
                                    gap: 6,
                                    alignItems: 'center',
                                }}
                            >
                                <Star size={14} /> How hard did this feel to you?
                            </div>
                            <div style={{ display: 'flex', gap: 8 }}>
                                {DIFFICULTY_OPTIONS.map((difficulty) => (
                                    <button
                                        key={difficulty}
                                        onClick={() => setUserDiff(difficulty)}
                                        style={{
                                            padding: '6px 16px',
                                            borderRadius: 20,
                                            cursor: 'pointer',
                                            border:
                                                userDiff === difficulty
                                                    ? `1px solid ${
                                                          difficulty === 'Easy'
                                                              ? '#34d399'
                                                              : difficulty === 'Hard'
                                                                ? '#f87171'
                                                                : '#fbbf24'
                                                      }`
                                                    : '1px solid var(--border)',
                                            background:
                                                userDiff === difficulty
                                                    ? `${
                                                          difficulty === 'Easy'
                                                              ? 'rgba(52,211,153,0.1)'
                                                              : difficulty === 'Hard'
                                                                ? 'rgba(248,113,113,0.1)'
                                                                : 'rgba(251,191,36,0.1)'
                                                      }`
                                                    : 'transparent',
                                            color:
                                                userDiff === difficulty
                                                    ? difficulty === 'Easy'
                                                        ? '#34d399'
                                                        : difficulty === 'Hard'
                                                          ? '#f87171'
                                                          : '#fbbf24'
                                                    : '#64748b',
                                            fontSize: '0.82rem',
                                            fontWeight: userDiff === difficulty ? 600 : 400,
                                        }}
                                    >
                                        {difficulty}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
                            <button
                                className="btn-primary"
                                onClick={saveAndNext}
                                disabled={saving}
                                style={{ padding: '11px 24px' }}
                            >
                                {saving ? (
                                    <>
                                        <div className="spinner" /> Saving...
                                    </>
                                ) : currentQ >= totalQ - 1 ? (
                                    <>
                                        <CheckCircle size={16} /> Finish Interview
                                    </>
                                ) : (
                                    <>
                                        Next Question <ChevronRight size={16} />
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
