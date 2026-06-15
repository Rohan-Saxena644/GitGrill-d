'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { ArrowLeft, BookOpen, Download, PlusCircle, Trophy } from 'lucide-react';
import { clearGuestSession, readGuestSession, touchGuestSession } from '@/lib/guest-session';
import { buildInterviewMarkdown } from '@/lib/interview-export';
import { buildInterviewInsights } from '@/lib/interview-insights';
import { Answer, GuestSessionState, ISession, Question } from '@/types';

function ScoreBar({ score }: { score?: number }) {
    if (score === undefined) return <span style={{ color: '#7d7165' }}>Not answered</span>;
    const cls = score >= 7 ? 'score-high' : score >= 5 ? 'score-medium' : 'score-low';
    return (
        <div className={`score-ring ${cls}`} style={{ width: 48, height: 48, fontSize: '0.95rem' }}>
            {score}
            <span style={{ fontSize: '0.6rem' }}>/10</span>
        </div>
    );
}

function DiffBadge({ difficulty, label }: { difficulty?: string; label?: string }) {
    if (!difficulty) return null;
    const cls =
        difficulty === 'Easy' ? 'badge-easy' : difficulty === 'Hard' ? 'badge-hard' : 'badge-medium';
    return <span className={`badge ${cls}`}>{label ?? difficulty}</span>;
}

export default function InterviewReview({
    mode,
    sessionId,
}: {
    mode: 'saved' | 'guest';
    sessionId?: string;
}) {
    const { status } = useSession();
    const router = useRouter();
    const [session, setSession] = useState<ISession | GuestSessionState | null>(null);
    const [loading, setLoading] = useState(true);

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
                    setSession(data);
                    setLoading(false);
                })
                .catch(() => router.push('/dashboard'));
            return;
        }

        const guestSession = readGuestSession();
        if (!guestSession) {
            router.push('/interview/new');
            return;
        }

        touchGuestSession();
        setSession(guestSession);
        setLoading(false);
    }, [mode, router, sessionId, status]);

    const answeredScores = useMemo(
        () => session?.answers.filter((answer) => answer.score !== undefined).map((answer) => answer.score as number) ?? [],
        [session]
    );
    const insights = useMemo(() => (session ? buildInterviewInsights(session) : null), [session]);

    if (loading || (mode === 'saved' && status === 'loading')) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
                <div className="spinner" style={{ width: 40, height: 40 }} />
            </div>
        );
    }

    if (!session) return null;

    const avgScore = answeredScores.length
        ? answeredScores.reduce((total, score) => total + score, 0) / answeredScores.length
        : 0;

    const mcqQuestions = session.questions.filter((question) => question.type === 'mcq');
    const openEndedQuestions = session.questions.filter((question) => question.type !== 'mcq');
    const correctCount = session.answers.filter((answer) => answer.isCorrect).length;
    const accuracy = mcqQuestions.length ? Math.round((correctCount / mcqQuestions.length) * 100) : 0;

    function exportReview() {
        if (!session) return;

        const markdown = buildInterviewMarkdown(session);
        const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        const sessionLabel =
            session.interviewTrack === 'systems'
                ? 'systems-track'
                : `${session.repoOwner}-${session.repoName}`.replace(/[^a-z0-9-_]+/gi, '-').toLowerCase();

        link.href = url;
        link.download = `codeviva-${sessionLabel}-review.md`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
    }

    return (
        <div className="page-container" style={{ padding: '32px 24px', maxWidth: 860 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
                <Link
                    href={mode === 'saved' ? '/dashboard' : '/interview/new'}
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
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    <button className="btn-secondary" onClick={exportReview} style={{ fontSize: '0.85rem', padding: '8px 16px' }}>
                        <Download size={15} /> Export Markdown
                    </button>
                    <Link
                        href="/interview/new"
                        className="btn-secondary"
                        style={{ textDecoration: 'none', fontSize: '0.85rem', padding: '8px 16px' }}
                        onClick={() => {
                            if (mode === 'guest') clearGuestSession();
                        }}
                    >
                        <PlusCircle size={15} /> New Interview
                    </Link>
                </div>
            </div>

            <div
                className="glass-card"
                style={{
                    padding: '28px 32px',
                    marginBottom: 32,
                    background: 'linear-gradient(135deg, rgba(232,130,90,0.08), rgba(196,99,61,0.08))',
                    display: 'flex',
                    gap: 24,
                    alignItems: 'center',
                    flexWrap: 'wrap',
                }}
            >
                <div
                    style={{
                        width: 64,
                        height: 64,
                        borderRadius: 16,
                        background: 'linear-gradient(135deg,#e8825a,#c4633d)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                >
                    <Trophy size={28} color="white" />
                </div>
                <div style={{ flex: 1 }}>
                    <h1 style={{ color: '#f5ece1', fontWeight: 700, fontSize: '1.4rem', marginBottom: 4 }}>
                        {mode === 'guest' ? 'Guest Review' : 'Interview Complete'}
                    </h1>
                    <p style={{ color: '#ab9d90', fontSize: '0.9rem' }}>
                        {session.interviewTrack === 'systems'
                            ? `Systems Track · ${session.systemTopics?.length ?? 0} topics selected · ${correctCount} correct out of ${mcqQuestions.length} MCQs, plus ${openEndedQuestions.length} open-ended questions`
                            : `${session.repoOwner}/${session.repoName} · ${correctCount} correct out of ${mcqQuestions.length} MCQs, plus ${openEndedQuestions.length} open-ended questions`}
                    </p>
                </div>
                <div style={{ textAlign: 'center' }}>
                    <div
                        style={{
                            color: accuracy >= 70 ? '#9cba78' : accuracy >= 50 ? '#e0ad55' : '#d8654f',
                            fontSize: '2.2rem',
                            fontWeight: 800,
                        }}
                    >
                        {accuracy}%
                    </div>
                    <div style={{ color: '#ab9d90', fontSize: '0.8rem' }}>mcq accuracy</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                    <div
                        style={{
                            color: avgScore >= 7 ? '#9cba78' : avgScore >= 5 ? '#e0ad55' : '#d8654f',
                            fontSize: '2.2rem',
                            fontWeight: 800,
                        }}
                    >
                        {avgScore.toFixed(1)}
                    </div>
                    <div style={{ color: '#ab9d90', fontSize: '0.8rem' }}>avg score</div>
                </div>
            </div>

            {insights && (
                <div
                    style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 240px), 1fr))',
                        gap: 14,
                        marginBottom: 28,
                    }}
                >
                    <div className="glass-card" style={{ padding: 20 }}>
                        <div style={{ color: '#7d7165', fontSize: '0.78rem', marginBottom: 8 }}>Strongest area</div>
                        <div style={{ color: '#9cba78', fontWeight: 700, fontSize: '1.05rem', marginBottom: 4 }}>
                            {insights.strongestCategory?.label ?? 'Not enough answers yet'}
                        </div>
                        <div style={{ color: '#ab9d90', fontSize: '0.84rem', lineHeight: 1.6 }}>
                            {insights.strongestCategory
                                ? `${insights.strongestCategory.avgScore}/10 average across ${insights.strongestCategory.answered} answer${insights.strongestCategory.answered === 1 ? '' : 's'}.`
                                : 'Finish more questions to see a reliable strength signal.'}
                        </div>
                    </div>

                    <div className="glass-card" style={{ padding: 20 }}>
                        <div style={{ color: '#7d7165', fontSize: '0.78rem', marginBottom: 8 }}>Needs more revision</div>
                        <div style={{ color: '#e0ad55', fontWeight: 700, fontSize: '1.05rem', marginBottom: 4 }}>
                            {insights.weakestCategory?.label ?? 'Not enough answers yet'}
                        </div>
                        <div style={{ color: '#ab9d90', fontSize: '0.84rem', lineHeight: 1.6 }}>
                            {insights.weakestCategory
                                ? `${insights.weakestCategory.avgScore}/10 average. This is the cleanest place to revise first.`
                                : 'No weak-area signal yet because there are not enough scored answers.'}
                        </div>
                    </div>

                    <div className="glass-card" style={{ padding: 20 }}>
                        <div style={{ color: '#7d7165', fontSize: '0.78rem', marginBottom: 8 }}>Felt hardest most often</div>
                        <div style={{ color: '#d8654f', fontWeight: 700, fontSize: '1.05rem', marginBottom: 4 }}>
                            {insights.hardestCategory?.label ?? 'Nothing marked Hard yet'}
                        </div>
                        <div style={{ color: '#ab9d90', fontSize: '0.84rem', lineHeight: 1.6 }}>
                            {insights.hardestCategory
                                ? `You marked ${insights.hardestCategory.hardCount} question${insights.hardestCategory.hardCount === 1 ? '' : 's'} from this area as hard.`
                                : 'Use the felt difficulty buttons during interviews to make this insight sharper.'}
                        </div>
                    </div>
                </div>
            )}

            {insights && insights.typeBreakdown.length > 0 && (
                <div className="glass-card" style={{ padding: 22, marginBottom: 28 }}>
                    <div style={{ color: '#f5ece1', fontWeight: 600, marginBottom: 12 }}>Score breakdown</div>
                    <div
                        style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))',
                            gap: 12,
                        }}
                    >
                        {insights.typeBreakdown.map((entry) => (
                            <div
                                key={entry.label}
                                style={{
                                    padding: '14px 16px',
                                    borderRadius: 12,
                                    background: 'rgba(28,22,17,0.6)',
                                    border: '1px solid rgba(212,150,110,0.1)',
                                }}
                            >
                                <div style={{ color: '#f5ece1', fontWeight: 600, marginBottom: 4 }}>{entry.label}</div>
                                <div style={{ color: '#e8825a', fontSize: '1.15rem', fontWeight: 700, marginBottom: 4 }}>
                                    {entry.avgScore}/10
                                </div>
                                <div style={{ color: '#ab9d90', fontSize: '0.82rem' }}>
                                    {entry.answered} answered question{entry.answered === 1 ? '' : 's'}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {session.questions.map((question: Question, index: number) => {
                    const answer: Answer | undefined = session.answers.find((entry) => entry.questionIndex === index);
                    const selectedOption =
                        typeof answer?.selectedOptionIndex === 'number'
                            ? question.options?.[answer.selectedOptionIndex]
                            : null;
                    const correctOption =
                        question.type === 'mcq' && typeof question.correctAnswerIndex === 'number'
                            ? question.options?.[question.correctAnswerIndex]
                            : null;

                    return (
                        <div key={index} className="glass-card animate-fade-in" style={{ padding: 24 }}>
                            <div
                                style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'flex-start',
                                    gap: 16,
                                    marginBottom: 16,
                                }}
                            >
                                <div style={{ flex: 1 }}>
                                    <div
                                        style={{
                                            display: 'flex',
                                            gap: 8,
                                            alignItems: 'center',
                                            marginBottom: 8,
                                            flexWrap: 'wrap',
                                        }}
                                    >
                                        <span style={{ color: '#7d7165', fontSize: '0.78rem', fontWeight: 600 }}>
                                            Q{index + 1}
                                        </span>
                                        <DiffBadge difficulty={question.difficulty} />
                                        <span
                                            className="badge"
                                            style={{
                                                background:
                                                    question.type === 'mcq'
                                                        ? 'rgba(196,99,61,0.14)'
                                                        : question.type === 'short-answer'
                                                          ? 'rgba(127,179,163,0.14)'
                                                        : 'rgba(217,138,163,0.14)',
                                                color:
                                                    question.type === 'mcq'
                                                        ? '#f0a878'
                                                        : question.type === 'short-answer'
                                                          ? '#7fb3a3'
                                                          : '#d98aa3',
                                            }}
                                        >
                                            {question.type === 'mcq'
                                                ? 'MCQ'
                                                : question.type === 'short-answer'
                                                  ? 'Short Answer'
                                                  : 'Descriptive'}
                                        </span>
                                        {question.userDifficulty && question.userDifficulty !== question.difficulty && (
                                            <DiffBadge difficulty={question.userDifficulty} label={`felt ${question.userDifficulty}`} />
                                        )}
                                        <span className="badge badge-blue">{question.category}</span>
                                        {answer?.isCorrect !== undefined && (
                                            <span
                                                className="badge"
                                                style={{
                                                    background: answer.isCorrect
                                                        ? 'rgba(156,186,120,0.14)'
                                                        : 'rgba(216,101,79,0.14)',
                                                    color: answer.isCorrect ? '#9cba78' : '#d8654f',
                                                }}
                                            >
                                                {answer.isCorrect ? 'Strong answer' : 'Needs review'}
                                            </span>
                                        )}
                                    </div>
                                    <p style={{ color: '#f5ece1', fontWeight: 500, lineHeight: 1.7 }}>
                                        {question.text}
                                    </p>
                                </div>
                                <ScoreBar score={answer?.score} />
                            </div>

                            {answer ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                    <div
                                        style={{
                                            padding: '12px 16px',
                                            borderRadius: 10,
                                            background: 'rgba(28,22,17,0.6)',
                                            border: '1px solid rgba(212,150,110,0.1)',
                                        }}
                                    >
                                        <div style={{ color: '#7d7165', fontSize: '0.78rem', marginBottom: 6 }}>
                                            Your answer
                                        </div>
                                        <p style={{ color: '#d8cdc1', fontSize: '0.88rem', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                                            {question.type === 'mcq' ? selectedOption ?? 'No option selected' : answer.text ?? 'No answer submitted'}
                                        </p>
                                    </div>

                                    <div
                                        style={{
                                            padding: '12px 16px',
                                            borderRadius: 10,
                                            background: 'rgba(196,99,61,0.05)',
                                            border: '1px solid rgba(196,99,61,0.2)',
                                        }}
                                    >
                                        <div style={{ color: '#f0a878', fontSize: '0.78rem', marginBottom: 6 }}>
                                            Why this was right or wrong
                                        </div>
                                        <p style={{ color: '#ab9d90', fontSize: '0.88rem', lineHeight: 1.7 }}>
                                            {answer.feedback}
                                        </p>
                                    </div>

                                    <div
                                        style={{
                                            padding: '12px 16px',
                                            borderRadius: 10,
                                            background: 'rgba(232,130,90,0.05)',
                                            border: '1px solid rgba(232,130,90,0.15)',
                                        }}
                                    >
                                        <div
                                            style={{
                                                color: '#e8825a',
                                                fontSize: '0.78rem',
                                                marginBottom: 6,
                                                display: 'flex',
                                                gap: 5,
                                                alignItems: 'center',
                                            }}
                                        >
                                            <BookOpen size={13} /> Best viva answer
                                        </div>
                                        <p style={{ color: '#ab9d90', fontSize: '0.88rem', lineHeight: 1.7 }}>
                                            {answer.aiAnswer}
                                        </p>
                                    </div>

                                    {question.type === 'mcq' && correctOption && (
                                        <div
                                            style={{
                                                padding: '12px 16px',
                                                borderRadius: 10,
                                                background: 'rgba(156,186,120,0.05)',
                                                border: '1px solid rgba(156,186,120,0.18)',
                                            }}
                                        >
                                            <div style={{ color: '#9cba78', fontSize: '0.78rem', marginBottom: 6 }}>
                                                Correct option
                                            </div>
                                            <p style={{ color: '#f5ece1', fontSize: '0.88rem', lineHeight: 1.7 }}>
                                                {correctOption}
                                            </p>
                                        </div>
                                    )}

                                    {answer.userNote && (
                                        <div
                                            style={{
                                                padding: '12px 16px',
                                                borderRadius: 10,
                                                background: 'rgba(224,173,85,0.05)',
                                                border: '1px solid rgba(224,173,85,0.2)',
                                            }}
                                        >
                                            <div style={{ color: '#e0ad55', fontSize: '0.78rem', marginBottom: 6 }}>
                                                Your note
                                            </div>
                                            <p style={{ color: '#f5ece1', fontSize: '0.88rem', lineHeight: 1.7 }}>
                                                {answer.userNote}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div style={{ color: '#7d7165', fontSize: '0.85rem', fontStyle: 'italic' }}>
                                    Not answered
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}