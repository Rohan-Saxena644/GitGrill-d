'use client';

import { useEffect, useState } from 'react';
import { Loader2, Cpu, Zap, BookOpen } from 'lucide-react';

// ─── What this component does ──────────────────────────────────────────────
//
// It's a full-screen overlay that appears while questions are being generated.
// It has two phases:
//
//  Phase 1 — "Waking up"  (shown when PYTHON_SERVICE_URL is cold-starting)
//    The Render free tier spins down after 15 min of inactivity.
//    When the first request hits a sleeping service, our route.ts catches the
//    503 and throws an error starting with "The AI backend is waking up".
//    We detect that in the parent and flip `isWakingUp` to true, which shows
//    this phase. We then auto-retry after 8 seconds.
//
//  Phase 2 — "Generating"  (normal AI work: RAG + LangGraph + Groq)
//    Cycles through fun status messages so the wait feels alive.
//
// ─── How to reuse this pattern in future projects ─────────────────────────
//
//  1. Any time you have a long async operation, lift a `loading` boolean into
//     the parent and pass it as a prop here.
//  2. For cold-start detection: catch errors in your fetch, check if the
//     message contains your sentinel string (e.g. "waking up"), set a state
//     flag, show this phase, then retry after N seconds.
//  3. The cycling messages are just an array + setInterval — swap in your own
//     copy to match your app's personality.

interface Props {
  isVisible: boolean;
  isWakingUp: boolean;        // true = backend cold-starting, show countdown
  onWakeRetry: () => void;    // called when countdown hits 0 to auto-retry
}

const GENERATING_MESSAGES = [
  { icon: <Cpu size={18} />,      text: 'Reading your repository files…' },
  { icon: <BookOpen size={18} />, text: 'Mapping code to topics with TF-IDF…' },
  { icon: <Zap size={18} />,      text: 'Sending context to Groq (llama-3.3-70b)…' },
  { icon: <BookOpen size={18} />, text: 'Agent building MCQs and descriptive questions…' },
  { icon: <Cpu size={18} />,      text: 'Validating question structure…' },
  { icon: <Zap size={18} />,      text: 'Almost there — formatting the interview…' },
];

const WAKE_UP_SECONDS = 35; // how long to count down before auto-retry

export default function GeneratingOverlay({ isVisible, isWakingUp, onWakeRetry }: Props) {
  const [msgIndex, setMsgIndex] = useState(0);
  const [countdown, setCountdown] = useState(WAKE_UP_SECONDS);
  const [dots, setDots] = useState('');

  // Cycle status messages every 2.8s during normal generation
  useEffect(() => {
    if (!isVisible || isWakingUp) return;
    const interval = setInterval(() => {
      setMsgIndex((i) => (i + 1) % GENERATING_MESSAGES.length);
    }, 2800);
    return () => clearInterval(interval);
  }, [isVisible, isWakingUp]);

  // Animated dots ("…" effect)
  useEffect(() => {
    if (!isVisible) return;
    const interval = setInterval(() => {
      setDots((d) => (d.length >= 3 ? '' : d + '.'));
    }, 500);
    return () => clearInterval(interval);
  }, [isVisible]);

  // Wake-up countdown — fires onWakeRetry when it hits 0
  useEffect(() => {
    if (!isWakingUp) {
      setCountdown(WAKE_UP_SECONDS);
      return;
    }
    if (countdown <= 0) {
      onWakeRetry();
      return;
    }
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [isWakingUp, countdown, onWakeRetry]);

  if (!isVisible) return null;

  const current = GENERATING_MESSAGES[msgIndex];

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(21,17,14,0.92)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <div
        style={{
          maxWidth: 480,
          width: '100%',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 0,
        }}
      >
        {/* ── Spinner ring ── */}
        <div style={{ position: 'relative', width: 72, height: 72, marginBottom: 28 }}>
          <svg
            width="72"
            height="72"
            style={{ position: 'absolute', inset: 0, animation: 'spin 1.4s linear infinite' }}
          >
            <circle
              cx="36" cy="36" r="30"
              fill="none"
              stroke="rgba(232,130,90,0.12)"
              strokeWidth="3"
            />
            <circle
              cx="36" cy="36" r="30"
              fill="none"
              stroke="#e8825a"
              strokeWidth="3"
              strokeDasharray="60 130"
              strokeLinecap="round"
            />
          </svg>
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#e8825a',
            }}
          >
            {isWakingUp ? <Zap size={24} /> : <Cpu size={24} />}
          </div>
        </div>

        {isWakingUp ? (
          /* ── Phase 1: Backend waking up ── */
          <>
            <h2
              style={{
                color: '#f5ece1',
                fontWeight: 700,
                fontSize: '1.25rem',
                marginBottom: 10,
                fontFamily: 'var(--font-display)',
              }}
            >
              AI backend is waking up
            </h2>
            <p style={{ color: '#ab9d90', fontSize: '0.9rem', lineHeight: 1.7, marginBottom: 24 }}>
              The Python service on Render&apos;s free tier spins down after inactivity.
              It&apos;ll be ready in about {WAKE_UP_SECONDS} seconds — auto-retrying for you.
            </p>

            {/* countdown ring */}
            <div style={{ position: 'relative', width: 80, height: 80, marginBottom: 20 }}>
              <svg width="80" height="80">
                <circle cx="40" cy="40" r="34" fill="none" stroke="rgba(224,173,85,0.12)" strokeWidth="4" />
                <circle
                  cx="40" cy="40" r="34"
                  fill="none"
                  stroke="#e0ad55"
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeDasharray={`${(countdown / WAKE_UP_SECONDS) * 213.6} 213.6`}
                  transform="rotate(-90 40 40)"
                  style={{ transition: 'stroke-dasharray 1s linear' }}
                />
              </svg>
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexDirection: 'column',
                }}
              >
                <span style={{ color: '#e0ad55', fontWeight: 700, fontSize: '1.4rem', lineHeight: 1 }}>
                  {countdown}
                </span>
                <span style={{ color: '#7d7165', fontSize: '0.65rem', marginTop: 2 }}>sec</span>
              </div>
            </div>

            <p style={{ color: '#7d7165', fontSize: '0.78rem' }}>
              Retrying automatically{dots}
            </p>
          </>
        ) : (
          /* ── Phase 2: Normal generation ── */
          <>
            <h2
              style={{
                color: '#f5ece1',
                fontWeight: 700,
                fontSize: '1.3rem',
                marginBottom: 10,
                fontFamily: 'var(--font-display)',
              }}
            >
              Generating your interview
            </h2>
            <p style={{ color: '#ab9d90', fontSize: '0.875rem', lineHeight: 1.7, marginBottom: 28 }}>
              The AI agent is reading your code, ranking relevant chunks, and writing
              tailored questions. This takes 10–30 seconds.
            </p>

            {/* status message pill */}
            <div
              key={msgIndex}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 18px',
                borderRadius: 24,
                background: 'rgba(232,130,90,0.08)',
                border: '1px solid rgba(232,130,90,0.2)',
                color: '#e8825a',
                fontSize: '0.84rem',
                animation: 'fadeIn 0.35s ease',
                marginBottom: 28,
              }}
            >
              {current.icon}
              <span>{current.text}</span>
            </div>

            {/* progress dots */}
            <div style={{ display: 'flex', gap: 8 }}>
              {GENERATING_MESSAGES.map((_, i) => (
                <div
                  key={i}
                  style={{
                    width: i === msgIndex ? 20 : 6,
                    height: 6,
                    borderRadius: 3,
                    background: i === msgIndex ? '#e8825a' : 'rgba(232,130,90,0.2)',
                    transition: 'all 0.4s ease',
                  }}
                />
              ))}
            </div>

            <p style={{ color: '#7d7165', fontSize: '0.78rem', marginTop: 20 }}>
              Powered by Groq · llama-3.3-70b{dots}
            </p>
          </>
        )}
      </div>

      {/* Inline keyframes — avoids touching globals.css */}
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}
