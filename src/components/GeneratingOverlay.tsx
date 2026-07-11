'use client';

import { useEffect, useState } from 'react';
import { BookOpen, Cpu, Zap } from 'lucide-react';

interface Props {
  isVisible: boolean;
}

const GENERATING_MESSAGES = [
  { icon: <Cpu size={18} />, text: 'Preparing selected repository context...' },
  { icon: <BookOpen size={18} />, text: 'Building the interview prompt...' },
  { icon: <Zap size={18} />, text: 'Sending one structured request to Gemini...' },
  { icon: <BookOpen size={18} />, text: 'Generating tailored interview questions...' },
  { icon: <Cpu size={18} />, text: 'Validating question structure...' },
  { icon: <Zap size={18} />, text: 'Almost there, formatting the interview...' },
];

export default function GeneratingOverlay({ isVisible }: Props) {
  const [msgIndex, setMsgIndex] = useState(0);
  const [dots, setDots] = useState('');

  useEffect(() => {
    if (!isVisible) return;
    const interval = setInterval(() => {
      setMsgIndex((i) => (i + 1) % GENERATING_MESSAGES.length);
    }, 2800);
    return () => clearInterval(interval);
  }, [isVisible]);

  useEffect(() => {
    if (!isVisible) return;
    const interval = setInterval(() => {
      setDots((d) => (d.length >= 3 ? '' : d + '.'));
    }, 500);
    return () => clearInterval(interval);
  }, [isVisible]);

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
        <div style={{ position: 'relative', width: 72, height: 72, marginBottom: 28 }}>
          <svg
            width="72"
            height="72"
            style={{ position: 'absolute', inset: 0, animation: 'spin 1.4s linear infinite' }}
          >
            <circle cx="36" cy="36" r="30" fill="none" stroke="rgba(232,130,90,0.12)" strokeWidth="3" />
            <circle
              cx="36"
              cy="36"
              r="30"
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
            <Cpu size={24} />
          </div>
        </div>

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
          Git Grilled is preparing your selected repository context and generating tailored interview questions.
          This usually takes 10-30 seconds.
        </p>

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
          Powered by Gemini direct inference{dots}
        </p>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}
