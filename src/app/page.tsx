'use client';

import Link from 'next/link';
import { useSession, signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Code2, Zap, Target, MessageSquare, BookOpen, GitBranch } from 'lucide-react';

const features = [
    {
        icon: <GitBranch size={22} />,
        title: 'Your Repo, Your Questions',
        desc: "Paste any public GitHub URL. The AI reads YOUR code and asks questions about decisions YOU made — not generic LeetCode problems.",
    },
    {
        icon: <Target size={22} />,
        title: 'Tag What Matters',
        desc: 'Mark files as Core Logic, Config, Boilerplate, or Tests. Control exactly what the AI focuses on.',
    },
    {
        icon: <Zap size={22} />,
        title: 'Focus Areas',
        desc: 'Pick your weak spots: Architecture, Error Handling, Performance, or Security.',
    },
    {
        icon: <MessageSquare size={22} />,
        title: 'Chat-Style Interview',
        desc: 'Answer one question at a time. The AI grades your answer, gives detailed feedback, and shows a model answer.',
    },
    {
        icon: <BookOpen size={22} />,
        title: 'Your Own Annotations',
        desc: 'After seeing AI feedback, add your own corrections and notes. Build a personal study guide.',
    },
    {
        icon: <Code2 size={22} />,
        title: 'All Sessions Saved',
        desc: 'Every interview is stored. Come back later to review your answers, scores, and annotations.',
    },
];

const steps = [
    { n: '01', title: 'Paste Repo URL', desc: 'Enter any public GitHub repo link.' },
    { n: '02', title: 'Tag Files', desc: 'Mark which files are most important.' },
    { n: '03', title: 'Pick Focus Areas', desc: 'Choose what topics to be quizzed on.' },
    { n: '04', title: 'Answer Questions', desc: 'AI generates questions from your actual code.' },
    { n: '05', title: 'Get Graded', desc: 'Gemini evaluates your answers with detailed feedback.' },
    { n: '06', title: 'Add Notes', desc: 'Annotate answers to build your study guide.' },
];

export default function LandingPage() {
    const { data: session } = useSession();
    const router = useRouter();

    const handleCTA = () => {
        if (session) {
            router.push('/interview/new');
        } else {
            signIn('github');
        }
    };

    return (
        <div style={{ minHeight: '100vh' }}>
            {/* ── Hero ── */}
            <section
                style={{
                    position: 'relative',
                    overflow: 'hidden',
                    padding: '100px 24px 80px',
                    textAlign: 'center',
                }}
            >
                {/* Background glow blobs */}
                <div
                    style={{
                        position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
                        width: 800, height: 500, borderRadius: '50%',
                        background: 'radial-gradient(ellipse, rgba(56,189,248,0.07) 0%, transparent 70%)',
                        pointerEvents: 'none',
                    }}
                />
                <div className="page-container" style={{ position: 'relative' }}>
                    {/* Badge */}
                    <div
                        style={{
                            display: 'inline-flex', alignItems: 'center', gap: 8,
                            padding: '6px 16px', borderRadius: 20, marginBottom: 28,
                            background: 'rgba(56,189,248,0.08)', border: '1px solid rgba(56,189,248,0.25)',
                            color: '#38bdf8', fontSize: '0.85rem', fontWeight: 600,
                        }}
                    >
                        <Zap size={14} />
                        Powered by Google Gemini AI
                    </div>

                    {/* Headline */}
                    <h1
                        style={{
                            fontSize: 'clamp(2.2rem, 5vw, 3.8rem)',
                            fontWeight: 800,
                            lineHeight: 1.15,
                            marginBottom: 20,
                            color: '#e2e8f0',
                        }}
                    >
                        Interview Yourself On{' '}
                        <span className="gradient-text">Your Own Code</span>
                    </h1>

                    <p
                        style={{
                            fontSize: '1.15rem',
                            color: '#94a3b8',
                            maxWidth: 580,
                            margin: '0 auto 40px',
                            lineHeight: 1.75,
                        }}
                    >
                        Paste a GitHub repo URL. Tag your key files. Get AI-generated technical interview questions
                        about decisions <em>you</em> made. 10× more useful than flashcards.
                    </p>

                    <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
                        <button onClick={handleCTA} className="btn-primary" style={{ padding: '14px 32px', fontSize: '1rem' }}>
                            {session ? 'Start New Interview' : 'Get Started — Free'}
                            <ArrowRight size={18} />
                        </button>
                        {session && (
                            <Link href="/dashboard" className="btn-secondary" style={{ padding: '14px 28px', fontSize: '1rem', textDecoration: 'none' }}>
                                View Dashboard
                            </Link>
                        )}
                    </div>

                    {/* Social proof */}
                    <p style={{ marginTop: 24, color: '#64748b', fontSize: '0.85rem' }}>
                        No credit card needed · Public repos only · Powered by Gemini 1.5 Flash
                    </p>
                </div>
            </section>

            {/* ── How It Works ── */}
            <section style={{ padding: '60px 24px', background: 'rgba(15,22,41,0.5)' }}>
                <div className="page-container">
                    <h2 style={{ textAlign: 'center', fontSize: '1.9rem', fontWeight: 700, marginBottom: 8, color: '#e2e8f0' }}>
                        How It Works
                    </h2>
                    <div className="section-divider" style={{ margin: '0 auto 48px' }} />
                    <div
                        style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                            gap: 20,
                        }}
                    >
                        {steps.map((s) => (
                            <div
                                key={s.n}
                                className="glass-card"
                                style={{ padding: '24px', display: 'flex', gap: 16, alignItems: 'flex-start' }}
                            >
                                <span
                                    style={{
                                        fontSize: '0.8rem', fontWeight: 800, color: '#38bdf8',
                                        background: 'rgba(56,189,248,0.1)', border: '1px solid rgba(56,189,248,0.25)',
                                        borderRadius: 8, padding: '4px 10px', flexShrink: 0, letterSpacing: '0.05em',
                                    }}
                                >
                                    {s.n}
                                </span>
                                <div>
                                    <div style={{ fontWeight: 600, color: '#e2e8f0', marginBottom: 4 }}>{s.title}</div>
                                    <div style={{ color: '#94a3b8', fontSize: '0.88rem', lineHeight: 1.6 }}>{s.desc}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── Features ── */}
            <section style={{ padding: '60px 24px' }}>
                <div className="page-container">
                    <h2 style={{ textAlign: 'center', fontSize: '1.9rem', fontWeight: 700, marginBottom: 8, color: '#e2e8f0' }}>
                        Everything You Need
                    </h2>
                    <div className="section-divider" style={{ margin: '0 auto 48px' }} />
                    <div
                        style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                            gap: 20,
                        }}
                    >
                        {features.map((f) => (
                            <div key={f.title} className="glass-card" style={{ padding: '28px' }}>
                                <div
                                    style={{
                                        width: 44, height: 44, borderRadius: 10,
                                        background: 'linear-gradient(135deg, rgba(14,165,233,0.2), rgba(99,102,241,0.2))',
                                        border: '1px solid rgba(56,189,248,0.2)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        color: '#38bdf8', marginBottom: 16,
                                    }}
                                >
                                    {f.icon}
                                </div>
                                <h3 style={{ fontWeight: 600, color: '#e2e8f0', marginBottom: 8 }}>{f.title}</h3>
                                <p style={{ color: '#94a3b8', fontSize: '0.9rem', lineHeight: 1.65 }}>{f.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── CTA Banner ── */}
            <section style={{ padding: '60px 24px' }}>
                <div className="page-container">
                    <div
                        style={{
                            background: 'linear-gradient(135deg, rgba(14,165,233,0.12), rgba(99,102,241,0.12))',
                            border: '1px solid rgba(56,189,248,0.2)',
                            borderRadius: 20,
                            padding: '60px 40px',
                            textAlign: 'center',
                        }}
                    >
                        <h2 style={{ fontSize: '2rem', fontWeight: 700, color: '#e2e8f0', marginBottom: 12 }}>
                            Start prepping with your own code
                        </h2>
                        <p style={{ color: '#94a3b8', marginBottom: 32, fontSize: '1.05rem' }}>
                            The questions nobody else gets asked — because they&apos;re about YOUR project.
                        </p>
                        <button onClick={handleCTA} className="btn-primary" style={{ padding: '14px 36px', fontSize: '1.05rem' }}>
                            {session ? 'New Interview' : 'Sign in with GitHub'}
                            <ArrowRight size={18} />
                        </button>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer style={{ padding: '24px', textAlign: 'center', color: '#64748b', fontSize: '0.85rem', borderTop: '1px solid rgba(99,179,237,0.08)' }}>
                Built with Next.js · MongoDB · Google Gemini · NextAuth
            </footer>
        </div>
    );
}
