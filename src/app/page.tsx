'use client';

import Link from 'next/link';
import { signIn, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { ArrowRight, BookOpen, Chrome, Code2, GitBranch, Github, MessageSquare, Target, Zap } from 'lucide-react';

const features = [
    {
        icon: <GitBranch size={22} />,
        title: 'Your Repo, Your Questions',
        desc: 'Paste any public GitHub URL. The AI reads your code and turns it into practical interview prep instead of generic trivia.',
    },
    {
        icon: <Target size={22} />,
        title: 'MCQ-First Practice',
        desc: 'Get 10 realistic multiple-choice questions with explanations that help you prep for vivas and interviews.',
    },
    {
        icon: <Zap size={22} />,
        title: 'Balanced Difficulty',
        desc: 'The generator now favors fair engineering questions over lookup-heavy internals, with a practical easy-medium-hard mix.',
    },
    {
        icon: <MessageSquare size={22} />,
        title: 'Answer One at a Time',
        desc: 'Stay focused with a guided interview flow that reveals the strongest answer and why it works.',
    },
    {
        icon: <BookOpen size={22} />,
        title: 'Build Your Viva Notes',
        desc: 'After each question, add your own note so every mistake becomes a reusable study card.',
    },
    {
        icon: <Code2 size={22} />,
        title: 'Guest Or Saved Sessions',
        desc: 'Practice instantly as a guest or sign in with Google or GitHub to save your interview history.',
    },
];

const steps = [
    { n: '01', label: 'Paste your public GitHub repo URL' },
    { n: '02', label: 'Tag files and choose focus areas' },
    { n: '03', label: 'Answer 10 AI-generated MCQs' },
    { n: '04', label: 'Review corrections and viva-ready explanations' },
];

export default function LandingPage() {
    const { data: session } = useSession();
    const router = useRouter();

    const startInterview = () => router.push('/interview/new');

    return (
        <div style={{ minHeight: '100vh' }}>
            <section
                style={{
                    position: 'relative',
                    overflow: 'hidden',
                    padding: 'clamp(60px, 10vw, 100px) 24px clamp(48px, 8vw, 80px)',
                    textAlign: 'center',
                }}
            >
                <div
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        width: 'min(800px, 100vw)',
                        height: 500,
                        borderRadius: '50%',
                        background: 'radial-gradient(ellipse, rgba(56,189,248,0.08) 0%, transparent 70%)',
                        pointerEvents: 'none',
                    }}
                />

                <div className="page-container" style={{ position: 'relative' }}>
                    <div
                        style={{
                            fontSize: 'clamp(2.8rem, 8vw, 5.5rem)',
                            fontWeight: 900,
                            lineHeight: 1,
                            marginBottom: 16,
                            letterSpacing: '-0.03em',
                            background: 'linear-gradient(135deg, #38bdf8 0%, #818cf8 100%)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                        }}
                    >
                        CodeViva
                    </div>

                    <div
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 8,
                            padding: '6px 16px',
                            borderRadius: 20,
                            marginBottom: 24,
                            background: 'rgba(56,189,248,0.08)',
                            border: '1px solid rgba(56,189,248,0.25)',
                            color: '#38bdf8',
                            fontSize: '0.82rem',
                            fontWeight: 600,
                        }}
                    >
                        <Zap size={13} /> AI-Powered Interview Prep
                    </div>

                    <h1
                        style={{
                            fontSize: 'clamp(1.4rem, 3.5vw, 2.4rem)',
                            fontWeight: 700,
                            lineHeight: 1.25,
                            marginBottom: 20,
                            color: '#e2e8f0',
                        }}
                    >
                        Practice interviews on <span className="gradient-text">your own code</span>
                    </h1>

                    <p
                        style={{
                            fontSize: 'clamp(1rem, 2vw, 1.15rem)',
                            color: '#94a3b8',
                            maxWidth: 620,
                            margin: '0 auto 40px',
                            lineHeight: 1.75,
                        }}
                    >
                        Paste a GitHub repo, tag the files that matter, and get 10 interview-style MCQs with
                        explanations tuned for viva prep. Start as a guest or save sessions with Google or GitHub.
                    </p>

                    <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
                        <button onClick={startInterview} className="btn-primary" style={{ padding: '14px 32px', fontSize: '1rem' }}>
                            {session ? 'Start New Interview' : 'Try Guest Mode'}
                            <ArrowRight size={18} />
                        </button>
                        {session ? (
                            <Link
                                href="/dashboard"
                                className="btn-secondary"
                                style={{ padding: '14px 28px', fontSize: '1rem', textDecoration: 'none' }}
                            >
                                View Dashboard
                            </Link>
                        ) : (
                            <>
                                <button onClick={() => signIn('google')} className="btn-secondary">
                                    <Chrome size={16} /> Google
                                </button>
                                <button onClick={() => signIn('github')} className="btn-secondary">
                                    <Github size={16} /> GitHub
                                </button>
                            </>
                        )}
                    </div>

                    <p style={{ marginTop: 20, color: '#64748b', fontSize: '0.82rem' }}>
                        Free to use · Public repos only · Guest reviews expire after 15 minutes of inactivity
                    </p>
                </div>
            </section>

            <section style={{ padding: '8px 24px 56px' }}>
                <div className="page-container">
                    <div
                        style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                            gap: 0,
                            background: 'rgba(19,29,53,0.5)',
                            border: '1px solid var(--border)',
                            borderRadius: 16,
                            overflow: 'hidden',
                        }}
                    >
                        {steps.map((step, index) => (
                            <div
                                key={step.n}
                                style={{
                                    padding: '24px 20px',
                                    borderRight: index < steps.length - 1 ? '1px solid var(--border)' : 'none',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: 8,
                                    alignItems: 'center',
                                    textAlign: 'center',
                                }}
                            >
                                <span
                                    style={{
                                        fontSize: '0.68rem',
                                        fontWeight: 800,
                                        color: '#38bdf8',
                                        letterSpacing: '0.1em',
                                        opacity: 0.8,
                                    }}
                                >
                                    {step.n}
                                </span>
                                <span
                                    style={{
                                        color: '#cbd5e1',
                                        fontSize: '0.85rem',
                                        fontWeight: 500,
                                        lineHeight: 1.4,
                                    }}
                                >
                                    {step.label}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <section style={{ padding: '20px 24px 80px' }}>
                <div className="page-container">
                    <div style={{ textAlign: 'center', marginBottom: 48 }}>
                        <h2
                            style={{
                                fontSize: 'clamp(1.5rem, 3vw, 1.9rem)',
                                fontWeight: 700,
                                color: '#e2e8f0',
                                marginBottom: 12,
                            }}
                        >
                            Everything You Need
                        </h2>
                        <div className="section-divider" style={{ margin: '0 auto' }} />
                    </div>

                    <div
                        style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))',
                            gap: 20,
                        }}
                    >
                        {features.map((feature) => (
                            <div key={feature.title} className="glass-card" style={{ padding: 'clamp(20px, 4vw, 28px)' }}>
                                <div
                                    style={{
                                        width: 44,
                                        height: 44,
                                        borderRadius: 10,
                                        flexShrink: 0,
                                        background: 'linear-gradient(135deg, rgba(14,165,233,0.2), rgba(99,102,241,0.2))',
                                        border: '1px solid rgba(56,189,248,0.2)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: '#38bdf8',
                                        marginBottom: 16,
                                    }}
                                >
                                    {feature.icon}
                                </div>
                                <h3
                                    style={{
                                        fontWeight: 600,
                                        color: '#e2e8f0',
                                        marginBottom: 8,
                                        fontSize: '0.95rem',
                                    }}
                                >
                                    {feature.title}
                                </h3>
                                <p style={{ color: '#94a3b8', fontSize: '0.875rem', lineHeight: 1.65 }}>
                                    {feature.desc}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <section style={{ padding: '0 24px 80px' }}>
                <div className="page-container">
                    <div
                        style={{
                            background: 'linear-gradient(135deg, rgba(14,165,233,0.1), rgba(99,102,241,0.1))',
                            border: '1px solid rgba(56,189,248,0.2)',
                            borderRadius: 20,
                            padding: 'clamp(36px, 6vw, 60px) clamp(24px, 5vw, 48px)',
                            textAlign: 'center',
                        }}
                    >
                        <h2
                            style={{
                                fontSize: 'clamp(1.4rem, 3vw, 2rem)',
                                fontWeight: 700,
                                color: '#e2e8f0',
                                marginBottom: 12,
                            }}
                        >
                            Stop practicing questions nobody asks
                        </h2>
                        <p
                            style={{
                                color: '#94a3b8',
                                fontSize: 'clamp(0.9rem, 2vw, 1rem)',
                                maxWidth: 520,
                                margin: '0 auto 32px',
                            }}
                        >
                            CodeViva now focuses on realistic code interviews and viva prep, with explanations that help
                            you say the right thing out loud.
                        </p>
                        <button onClick={startInterview} className="btn-primary" style={{ padding: '14px 36px', fontSize: '1.05rem' }}>
                            {session ? 'New Interview' : 'Start Guest Practice'}
                            <ArrowRight size={18} />
                        </button>
                    </div>
                </div>
            </section>

            <footer
                style={{
                    padding: '24px',
                    textAlign: 'center',
                    color: '#475569',
                    fontSize: '0.82rem',
                    borderTop: '1px solid rgba(99,179,237,0.08)',
                }}
            >
                Built with Next.js · MongoDB · OpenRouter AI · NextAuth
            </footer>
        </div>
    );
}
