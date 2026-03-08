'use client';

/**
 * /interview/[id] — Active interview chat page
 *
 * Shows one question at a time.
 * User types answer → hits Submit → AI evaluates → shows score + feedback.
 * User can add a personal note → then move to the next question.
 * After the last question, marks session as completed.
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import {
    ChevronRight, Loader2, CheckCircle, AlertCircle,
    BookOpen, ArrowLeft, Star
} from 'lucide-react';
import { ISession, Question, Answer, Difficulty } from '@/types';

const DIFFICULTY_OPTIONS: Difficulty[] = ['Easy', 'Medium', 'Hard'];

function DiffBadge({ d }: { d?: string }) {
    if (!d) return null;
    const cls = d === 'Easy' ? 'badge-easy' : d === 'Hard' ? 'badge-hard' : 'badge-medium';
    return <span className={`badge ${cls}`}>{d}</span>;
}

function ScoreDisplay({ score }: { score: number }) {
    const cls = score >= 7 ? 'score-high' : score >= 5 ? 'score-medium' : 'score-low';
    return <div className={`score-ring ${cls}`}>{score}<span style={{ fontSize: '0.65rem' }}>/10</span></div>;
}

export default function InterviewPage({ params }: { params: { id: string } }) {
    const { data: authSession, status } = useSession();
    const router = useRouter();

    const [session, setSession] = useState<ISession | null>(null);
    const [currentQ, setCurrentQ] = useState(0);
    const [answer, setAnswer] = useState('');
    const [note, setNote] = useState('');
    const [userDiff, setUserDiff] = useState<Difficulty | ''>('');
    const [evaluation, setEvaluation] = useState<{ score: number; feedback: string; aiAnswer: string } | null>(null);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [pageLoading, setPageLoading] = useState(true);

    // Redirect if not logged in
    useEffect(() => {
        if (status === 'unauthenticated') router.push('/');
    }, [status, router]);

    // Load session
    useEffect(() => {
        if (status !== 'authenticated') return;
        fetch(`/api/sessions/${params.id}`)
            .then((r) => r.json())
            .then((data) => {
                if (data.error) { router.push('/dashboard'); return; }
                if (data.status === 'completed') { router.push(`/interview/${params.id}/review`); return; }
                setSession(data);
                setCurrentQ(data.answers.length); // resume from where we left off
                setPageLoading(false);
            })
            .catch(() => { router.push('/dashboard'); });
    }, [params.id, status, router]);

    if (status === 'loading' || pageLoading) return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
            <div className="spinner" style={{ width: 40, height: 40 }} />
        </div>
    );

    if (!session || !session.questions.length) return null;

    const question: Question = session.questions[currentQ];
    const totalQ = session.questions.length;
    const progress = (currentQ / totalQ) * 100;

    // Submit answer for AI evaluation
    async function submitAnswer() {
        if (!answer.trim()) return;
        setError('');
        setLoading(true);
        try {
            const fileContext = session!.taggedFiles
                .slice(0, 3)
                .map((f) => `// ${f.path}\n${f.content ?? ''}`)
                .join('\n\n');

            const res = await fetch('/api/ai/evaluate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ question: question.text, userAnswer: answer, fileContext }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error ?? 'Evaluation failed');
            setEvaluation(data);
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : 'Something went wrong');
        } finally {
            setLoading(false);
        }
    }

    // Save answer + move to next question (or complete)
    async function saveAndNext() {
        if (!evaluation) return;
        setSaving(true);

        const newAnswer: Answer = {
            questionIndex: currentQ,
            text: answer,
            score: evaluation.score,
            feedback: evaluation.feedback,
            aiAnswer: evaluation.aiAnswer,
            userNote: note,
        };

        // Update question with user's difficulty rating if set
        const updatedQuestions = [...session!.questions];
        if (userDiff) updatedQuestions[currentQ] = { ...updatedQuestions[currentQ], userDifficulty: userDiff };

        const updatedAnswers = [...(session!.answers ?? []), newAnswer];
        const isLast = currentQ >= totalQ - 1;
        const newStatus = isLast ? 'completed' : 'active';

        await fetch(`/api/sessions/${params.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ answers: updatedAnswers, questions: updatedQuestions, status: newStatus }),
        });

        if (isLast) {
            router.push(`/interview/${params.id}/review`);
        } else {
            // Reset state for next question
            setCurrentQ(currentQ + 1);
            setAnswer('');
            setNote('');
            setUserDiff('');
            setEvaluation(null);
            setSession({ ...session!, answers: updatedAnswers, questions: updatedQuestions });
        }
        setSaving(false);
    }

    return (
        <div className="page-container" style={{ padding: '32px 24px', maxWidth: 780 }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <Link href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#94a3b8', textDecoration: 'none', fontSize: '0.875rem' }}>
                    <ArrowLeft size={15} /> Dashboard
                </Link>
                <span style={{ color: '#94a3b8', fontSize: '0.875rem' }}>
                    {session.repoOwner}/{session.repoName}
                </span>
            </div>

            {/* Progress bar */}
            <div style={{ marginBottom: 32 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <span style={{ color: '#94a3b8', fontSize: '0.82rem' }}>
                        Question {currentQ + 1} of {totalQ}
                    </span>
                    <span style={{ color: '#38bdf8', fontSize: '0.82rem', fontWeight: 600 }}>
                        {Math.round(progress)}% complete
                    </span>
                </div>
                <div style={{ height: 6, background: 'rgba(99,179,237,0.12)', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${progress}%`, background: 'linear-gradient(90deg, #0ea5e9, #6366f1)', borderRadius: 3, transition: 'width 0.4s' }} />
                </div>
            </div>

            {/* Question Card */}
            <div className="glass-card animate-fade-in" style={{ padding: 28, marginBottom: 20 }}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
                    <span className="badge badge-blue">{question.category}</span>
                    <DiffBadge d={question.difficulty} />
                </div>
                <p style={{ color: '#e2e8f0', fontSize: '1.05rem', lineHeight: 1.75, fontWeight: 500 }}>
                    {question.text}
                </p>
            </div>

            {/* Answer Input (hidden after evaluation) */}
            {!evaluation && (
                <div className="glass-card animate-fade-in" style={{ padding: 24, marginBottom: 16 }}>
                    <label style={{ color: '#94a3b8', fontSize: '0.85rem', display: 'block', marginBottom: 8 }}>
                        Your Answer
                    </label>
                    <textarea
                        className="input"
                        placeholder="Explain your thinking clearly — as you would in a real interview..."
                        value={answer}
                        onChange={(e) => setAnswer(e.target.value)}
                        style={{ minHeight: 140 }}
                    />
                    {error && (
                        <div style={{ marginTop: 10, color: '#f87171', fontSize: '0.85rem', display: 'flex', gap: 6, alignItems: 'center' }}>
                            <AlertCircle size={14} /> {error}
                        </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 14 }}>
                        <button
                            className="btn-primary"
                            onClick={submitAnswer}
                            disabled={loading || !answer.trim()}
                            style={{ padding: '11px 24px' }}
                        >
                            {loading ? <><div className="spinner" /> Evaluating…</> : <>Submit Answer <ChevronRight size={16} /></>}
                        </button>
                    </div>
                </div>
            )}

            {/* Evaluation Result */}
            {evaluation && (
                <div className="animate-slide-up">
                    {/* Score + Feedback */}
                    <div className="glass-card" style={{ padding: 24, marginBottom: 16 }}>
                        <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', marginBottom: 20 }}>
                            <ScoreDisplay score={evaluation.score} />
                            <div>
                                <div style={{ color: '#e2e8f0', fontWeight: 600, marginBottom: 8 }}>AI Feedback</div>
                                <p style={{ color: '#94a3b8', lineHeight: 1.7, fontSize: '0.9rem' }}>{evaluation.feedback}</p>
                            </div>
                        </div>
                        {/* AI Model Answer */}
                        <div style={{ padding: 16, borderRadius: 10, background: 'rgba(56,189,248,0.05)', border: '1px solid rgba(56,189,248,0.15)' }}>
                            <div style={{ color: '#38bdf8', fontWeight: 600, fontSize: '0.85rem', marginBottom: 8, display: 'flex', gap: 6 }}>
                                <BookOpen size={15} /> Model Answer
                            </div>
                            <p style={{ color: '#94a3b8', lineHeight: 1.75, fontSize: '0.88rem' }}>{evaluation.aiAnswer}</p>
                        </div>
                    </div>

                    {/* Your answer review */}
                    <div className="glass-card" style={{ padding: 20, marginBottom: 16 }}>
                        <div style={{ color: '#64748b', fontSize: '0.8rem', marginBottom: 6 }}>Your answer</div>
                        <p style={{ color: '#cbd5e1', fontSize: '0.88rem', lineHeight: 1.7 }}>{answer}</p>
                    </div>

                    {/* User annotations */}
                    <div className="glass-card" style={{ padding: 24, marginBottom: 20 }}>
                        <label style={{ color: '#94a3b8', fontSize: '0.85rem', display: 'block', marginBottom: 6 }}>
                            📝 Add your own note / correction (optional)
                        </label>
                        <textarea
                            className="input"
                            placeholder="What did you miss? What would you say differently? Your personal notes here..."
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            style={{ minHeight: 90 }}
                        />

                        {/* Difficulty rating */}
                        <div style={{ marginTop: 16 }}>
                            <div style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: 8, display: 'flex', gap: 6, alignItems: 'center' }}>
                                <Star size={14} /> How hard did this feel to you?
                            </div>
                            <div style={{ display: 'flex', gap: 8 }}>
                                {DIFFICULTY_OPTIONS.map((d) => (
                                    <button
                                        key={d}
                                        onClick={() => setUserDiff(d)}
                                        style={{
                                            padding: '6px 16px', borderRadius: 20, cursor: 'pointer',
                                            border: userDiff === d
                                                ? `1px solid ${d === 'Easy' ? '#34d399' : d === 'Hard' ? '#f87171' : '#fbbf24'}`
                                                : '1px solid var(--border)',
                                            background: userDiff === d
                                                ? `${d === 'Easy' ? 'rgba(52,211,153,0.1)' : d === 'Hard' ? 'rgba(248,113,113,0.1)' : 'rgba(251,191,36,0.1)'}`
                                                : 'transparent',
                                            color: userDiff === d
                                                ? (d === 'Easy' ? '#34d399' : d === 'Hard' ? '#f87171' : '#fbbf24')
                                                : '#64748b',
                                            fontSize: '0.82rem', fontWeight: userDiff === d ? 600 : 400,
                                        }}
                                    >
                                        {d}
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
                                {saving ? <><div className="spinner" /> Saving…</> : currentQ >= totalQ - 1 ? <><CheckCircle size={16} /> Finish Interview</> : <>Next Question <ChevronRight size={16} /></>}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
