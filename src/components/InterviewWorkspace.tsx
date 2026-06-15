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
    correctAnswerIndex?: number;
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
    const [answerText, setAnswerText] = useState('');
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
    const currentQuestion = question;

    const progress = (currentQ / totalQ) * 100;

    async function submitAnswer() {
        if (currentQuestion.type === 'mcq' && selectedOptionIndex === null) return;
        if (currentQuestion.type !== 'mcq' && !answerText.trim()) return;

        setError('');
        setLoading(true);
        try {
            const response = await fetch('/api/ai/evaluate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    question: currentQuestion,
                    selectedOptionIndex,
                    userAnswer: answerText,
                }),
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
        if (!session || !evaluation) return;
        if (currentQuestion.type === 'mcq' && selectedOptionIndex === null) return;
        if (currentQuestion.type !== 'mcq' && !answerText.trim()) return;

        setSaving(true);

        const newAnswer: Answer = {
            questionIndex: currentQ,
            text: currentQuestion.type !== 'mcq' ? answerText : undefined,
            selectedOptionIndex: currentQuestion.type === 'mcq' ? selectedOptionIndex ?? undefined : undefined,
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
            setAnswerText('');
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
                        color: '#ab9d90',
                        textDecoration: 'none',
                        fontSize: '0.875rem',
                    }}
                >
                    <ArrowLeft size={15} /> {mode === 'saved' ? 'Dashboard' : 'Back'}
                </Link>
                <span style={{ color: '#ab9d90', fontSize: '0.875rem' }}>
                    {session.interviewTrack === 'systems'
                        ? `Systems Track · ${session.systemTopics?.length ?? 0} topics`
                        : `${session.repoOwner}/${session.repoName}`}
                </span>
            </div>

            <div style={{ marginBottom: 32 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <span style={{ color: '#ab9d90', fontSize: '0.82rem' }}>
                        Question {currentQ + 1} of {totalQ}
                    </span>
                    <span style={{ color: '#e8825a', fontSize: '0.82rem', fontWeight: 600 }}>
                        {Math.round(progress)}% complete
                    </span>
                </div>
                <div
                    style={{
                        height: 6,
                        background: 'rgba(212,150,110,0.12)',
                        borderRadius: 3,
                        overflow: 'hidden',
                    }}
                >
                    <div
                        style={{
                            height: '100%',
                            width: `${progress}%`,
                            background: 'linear-gradient(90deg, #e8825a, #c4633d)',
                            borderRadius: 3,
                            transition: 'width 0.4s',
                        }}
                    />
                </div>
            </div>

            <div className="glass-card animate-fade-in" style={{ padding: 28, marginBottom: 20 }}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
                    <span className="badge badge-blue">{question.category}</span>
                    <DiffBadge difficulty={currentQuestion.difficulty} />
                    <span
                        className="badge"
                        style={{
                            background:
                                currentQuestion.type === 'mcq'
                                    ? 'rgba(196,99,61,0.14)'
                                    : currentQuestion.type === 'short-answer'
                                      ? 'rgba(127,179,163,0.14)'
                                      : 'rgba(217,138,163,0.14)',
                            color:
                                currentQuestion.type === 'mcq'
                                    ? '#f0a878'
                                    : currentQuestion.type === 'short-answer'
                                      ? '#7fb3a3'
                                      : '#d98aa3',
                        }}
                    >
                        {currentQuestion.type === 'mcq'
                            ? 'MCQ'
                            : currentQuestion.type === 'short-answer'
                              ? 'Short Answer'
                              : 'Descriptive'}
                    </span>
                    {mode === 'guest' && (
                        <span className="badge" style={{ background: 'rgba(224,173,85,0.12)', color: '#e0ad55' }}>
                            Guest session
                        </span>
                    )}
                </div>
                <p style={{ color: '#f5ece1', fontSize: '1.05rem', lineHeight: 1.75, fontWeight: 500 }}>
                    {currentQuestion.text}
                </p>
            </div>

            {!evaluation && (
                <div className="glass-card animate-fade-in" style={{ padding: 24, marginBottom: 16 }}>
                    {currentQuestion.type === 'mcq' ? (
                        <>
                            <label style={{ color: '#ab9d90', fontSize: '0.85rem', display: 'block', marginBottom: 12 }}>
                                Pick the best answer
                            </label>
                            <div style={{ display: 'grid', gap: 12 }}>
                                {(currentQuestion.options ?? []).map((option, index) => {
                                    const active = selectedOptionIndex === index;
                                    return (
                                        <button
                                            key={`${index}-${option}`}
                                            onClick={() => setSelectedOptionIndex(index)}
                                            style={{
                                                padding: '14px 16px',
                                                borderRadius: 12,
                                                border: active
                                                    ? '1px solid rgba(232,130,90,0.6)'
                                                    : '1px solid var(--border)',
                                                background: active ? 'rgba(232,130,90,0.08)' : 'rgba(28,22,17,0.65)',
                                                color: active ? '#f5ece1' : '#ab9d90',
                                                textAlign: 'left',
                                                cursor: 'pointer',
                                                transition: 'all 0.15s',
                                            }}
                                        >
                                            <div style={{ display: 'flex', gap: 12 }}>
                                                <span
                                                    style={{
                                                        color: active ? '#e8825a' : '#7d7165',
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
                        </>
                    ) : (
                        <>
                            <label style={{ color: '#ab9d90', fontSize: '0.85rem', display: 'block', marginBottom: 8 }}>
                                {currentQuestion.type === 'short-answer' ? 'Write a compact answer' : 'Write your answer'}
                            </label>
                            <textarea
                                className="input"
                                placeholder={
                                    currentQuestion.type === 'short-answer'
                                        ? "Answer this like a quick live interview response in 2-4 sentences."
                                        : "Answer this like you're in a real interview. Explain your reasoning clearly."
                                }
                                value={answerText}
                                onChange={(e) => setAnswerText(e.target.value)}
                                style={{ minHeight: currentQuestion.type === 'short-answer' ? 120 : 150 }}
                            />
                        </>
                    )}

                    {error && (
                        <div
                            style={{
                                marginTop: 10,
                                color: '#d8654f',
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
                            disabled={
                                loading ||
                                (currentQuestion.type === 'mcq' ? selectedOptionIndex === null : !answerText.trim())
                            }
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

            {evaluation && (
                <div className="animate-slide-up">
                    <div className="glass-card" style={{ padding: 24, marginBottom: 16 }}>
                        <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', marginBottom: 20 }}>
                            <ScoreDisplay score={evaluation.score} />
                            <div>
                                <div style={{ color: '#f5ece1', fontWeight: 600, marginBottom: 8 }}>
                                    {evaluation.isCorrect ? 'You got it right' : 'You can tighten this answer'}
                                </div>
                                <p style={{ color: '#ab9d90', lineHeight: 1.7, fontSize: '0.9rem' }}>
                                    {evaluation.feedback}
                                </p>
                            </div>
                        </div>
                        <div
                            style={{
                                padding: 16,
                                borderRadius: 10,
                                background: 'rgba(232,130,90,0.05)',
                                border: '1px solid rgba(232,130,90,0.15)',
                            }}
                        >
                            <div
                                style={{
                                    color: '#e8825a',
                                    fontWeight: 600,
                                    fontSize: '0.85rem',
                                    marginBottom: 8,
                                    display: 'flex',
                                    gap: 6,
                                }}
                            >
                                <BookOpen size={15} /> Interview-ready explanation
                            </div>
                            <p style={{ color: '#ab9d90', lineHeight: 1.75, fontSize: '0.88rem' }}>
                                {evaluation.aiAnswer}
                            </p>
                        </div>
                    </div>

                    <div className="glass-card" style={{ padding: 20, marginBottom: 16 }}>
                        <div style={{ color: '#7d7165', fontSize: '0.8rem', marginBottom: 6 }}>
                            {currentQuestion.type === 'mcq' ? 'Your selection' : 'Your answer'}
                        </div>
                        <p style={{ color: '#d8cdc1', fontSize: '0.88rem', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                            {currentQuestion.type === 'mcq' && selectedOptionIndex !== null
                                ? `${String.fromCharCode(65 + selectedOptionIndex)}. ${(currentQuestion.options ?? [])[selectedOptionIndex]}`
                                : answerText}
                        </p>
                    </div>

                    <div className="glass-card" style={{ padding: 24, marginBottom: 20 }}>
                        <label style={{ color: '#ab9d90', fontSize: '0.85rem', display: 'block', marginBottom: 6 }}>
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
                                    color: '#ab9d90',
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
                                                              ? '#9cba78'
                                                              : difficulty === 'Hard'
                                                                ? '#d8654f'
                                                                : '#e0ad55'
                                                      }`
                                                    : '1px solid var(--border)',
                                            background:
                                                userDiff === difficulty
                                                    ? `${
                                                          difficulty === 'Easy'
                                                              ? 'rgba(156,186,120,0.1)'
                                                              : difficulty === 'Hard'
                                                                ? 'rgba(216,101,79,0.1)'
                                                                : 'rgba(224,173,85,0.1)'
                                                      }`
                                                    : 'transparent',
                                            color:
                                                userDiff === difficulty
                                                    ? difficulty === 'Easy'
                                                        ? '#9cba78'
                                                        : difficulty === 'Hard'
                                                          ? '#d8654f'
                                                          : '#e0ad55'
                                                    : '#7d7165',
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