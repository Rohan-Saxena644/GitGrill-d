'use client';

import Link from 'next/link';
import { useSession, signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Code2, Zap, Target, MessageSquare, BookOpen, GitBranch } from 'lucide-react';

const features = [
  {
    icon: <GitBranch size={22} />,
    title: 'Your Repo, Your Questions',
    desc: 'Paste any public GitHub URL. The AI reads YOUR code and asks about decisions YOU made — not generic LeetCode problems.',
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
    desc: 'After seeing AI feedback, add your own corrections and notes. Build a personal study guide from your mistakes.',
  },
  {
    icon: <Code2 size={22} />,
    title: 'All Sessions Saved',
    desc: 'Every interview is stored. Come back to review your answers, scores, and personal annotations anytime.',
  },
];

const steps = [
  { n: '01', label: 'Paste your GitHub repo URL' },
  { n: '02', label: 'Tag files & pick focus areas' },
  { n: '03', label: 'Answer AI-generated questions' },
  { n: '04', label: 'Review scores & model answers' },
];

export default function LandingPage() {
  const { data: session } = useSession();
  const router = useRouter();

  const handleCTA = () => {
    if (session) router.push('/interview/new');
    else signIn('github');
  };

  return (
    <div style={{ minHeight: '100vh' }}>

      {/* ── Hero ── */}
      <section style={{ position: 'relative', overflow: 'hidden', padding: 'clamp(60px, 10vw, 100px) 24px clamp(48px, 8vw, 80px)', textAlign: 'center' }}>
        {/* glow blob */}
        <div style={{
          position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
          width: 'min(800px, 100vw)', height: 500, borderRadius: '50%',
          background: 'radial-gradient(ellipse, rgba(56,189,248,0.08) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        <div className="page-container" style={{ position: 'relative' }}>
          {/* App name */}
          <div style={{
            fontSize: 'clamp(2.8rem, 8vw, 5.5rem)',
            fontWeight: 900, lineHeight: 1,
            marginBottom: 16, letterSpacing: '-0.03em',
            background: 'linear-gradient(135deg, #38bdf8 0%, #818cf8 100%)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>
            CodeViva
          </div>

          {/* Badge */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '6px 16px', borderRadius: 20, marginBottom: 24,
            background: 'rgba(56,189,248,0.08)', border: '1px solid rgba(56,189,248,0.25)',
            color: '#38bdf8', fontSize: '0.82rem', fontWeight: 600,
          }}>
            <Zap size={13} /> AI-Powered Interview Prep
          </div>

          {/* Headline */}
          <h1 style={{
            fontSize: 'clamp(1.4rem, 3.5vw, 2.4rem)',
            fontWeight: 700, lineHeight: 1.25,
            marginBottom: 20, color: '#e2e8f0',
          }}>
            Interview yourself on{' '}
            <span className="gradient-text">your own code</span>
          </h1>

          <p style={{
            fontSize: 'clamp(1rem, 2vw, 1.15rem)',
            color: '#94a3b8', maxWidth: 560,
            margin: '0 auto 40px', lineHeight: 1.75,
          }}>
            Paste a GitHub repo URL. Tag your key files. Get AI-generated
            technical interview questions about decisions <em>you</em> made.
            10× more useful than flashcards.
          </p>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
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

          <p style={{ marginTop: 20, color: '#64748b', fontSize: '0.82rem' }}>
            Free to use · Public repos only · No credit card required
          </p>
        </div>
      </section>

      {/* ── How it Works ── */}
      <section style={{ padding: '8px 24px 56px' }}>
        <div className="page-container">
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
            gap: 0,
            background: 'rgba(19,29,53,0.5)',
            border: '1px solid var(--border)',
            borderRadius: 16,
            overflow: 'hidden',
          }}>
            {steps.map((s, i) => (
              <div key={s.n} style={{
                padding: '24px 20px',
                borderRight: i < steps.length - 1 ? '1px solid var(--border)' : 'none',
                display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center', textAlign: 'center',
              }}>
                <span style={{
                  fontSize: '0.68rem', fontWeight: 800, color: '#38bdf8',
                  letterSpacing: '0.1em', opacity: 0.8,
                }}>{s.n}</span>
                <span style={{ color: '#cbd5e1', fontSize: '0.85rem', fontWeight: 500, lineHeight: 1.4 }}>
                  {s.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section style={{ padding: '20px 24px 80px' }}>
        <div className="page-container">
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <h2 style={{ fontSize: 'clamp(1.5rem, 3vw, 1.9rem)', fontWeight: 700, color: '#e2e8f0', marginBottom: 12 }}>
              Everything You Need
            </h2>
            <div className="section-divider" style={{ margin: '0 auto' }} />
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))',
            gap: 20,
          }}>
            {features.map((f) => (
              <div key={f.title} className="glass-card" style={{ padding: 'clamp(20px, 4vw, 28px)' }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 10, flexShrink: 0,
                  background: 'linear-gradient(135deg, rgba(14,165,233,0.2), rgba(99,102,241,0.2))',
                  border: '1px solid rgba(56,189,248,0.2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#38bdf8', marginBottom: 16,
                }}>
                  {f.icon}
                </div>
                <h3 style={{ fontWeight: 600, color: '#e2e8f0', marginBottom: 8, fontSize: '0.95rem' }}>{f.title}</h3>
                <p style={{ color: '#94a3b8', fontSize: '0.875rem', lineHeight: 1.65 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Banner ── */}
      <section style={{ padding: '0 24px 80px' }}>
        <div className="page-container">
          <div style={{
            background: 'linear-gradient(135deg, rgba(14,165,233,0.1), rgba(99,102,241,0.1))',
            border: '1px solid rgba(56,189,248,0.2)',
            borderRadius: 20,
            padding: 'clamp(36px, 6vw, 60px) clamp(24px, 5vw, 48px)',
            textAlign: 'center',
          }}>
            <h2 style={{ fontSize: 'clamp(1.4rem, 3vw, 2rem)', fontWeight: 700, color: '#e2e8f0', marginBottom: 12 }}>
              Stop practising generic questions
            </h2>
            <p style={{ color: '#94a3b8', fontSize: 'clamp(0.9rem, 2vw, 1rem)', marginBottom: 32, maxWidth: 460, margin: '0 auto 32px' }}>
              The best interview prep is explaining the code you already wrote. Start in under a minute.
            </p>
            <button onClick={handleCTA} className="btn-primary" style={{ padding: '14px 36px', fontSize: '1.05rem' }}>
              {session ? 'New Interview' : 'Sign in with GitHub'}
              <ArrowRight size={18} />
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{
        padding: '24px',
        textAlign: 'center',
        color: '#475569',
        fontSize: '0.82rem',
        borderTop: '1px solid rgba(99,179,237,0.08)',
      }}>
        Built with Next.js · MongoDB · OpenRouter AI · NextAuth
      </footer>
    </div>
  );
}