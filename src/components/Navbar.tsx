'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useSession, signIn, signOut } from 'next-auth/react';
import { Code2, LogOut, LayoutDashboard, PlusCircle } from 'lucide-react';

export default function Navbar() {
  const { data: session } = useSession();

  return (
    <>
      <style>{`
        .nav-logo-text {
          font-weight: 700;
          font-size: 1rem;
          background: linear-gradient(135deg, #38bdf8 0%, #818cf8 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          white-space: nowrap;
        }
        .nav-links-text {
          display: inline;
        }
        .nav-signin-text {
          display: inline;
        }
        @media (max-width: 480px) {
          .nav-logo-text {
            display: none;
          }
          .nav-links-text {
            display: none;
          }
          .nav-signin-text {
            display: none;
          }
        }
      `}</style>

      <nav style={{
        background: 'rgba(10,15,30,0.88)',
        backdropFilter: 'blur(14px)',
        borderBottom: '1px solid rgba(99,179,237,0.1)',
        position: 'sticky', top: 0, zIndex: 100,
        padding: '0 16px',
      }}>
        <div style={{
          maxWidth: 1200, margin: '0 auto',
          display: 'flex', alignItems: 'center',
          justifyContent: 'space-between',
          height: 60,
        }}>
          {/* Logo */}
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 9, textDecoration: 'none', flexShrink: 0 }}>
            <div style={{
              background: 'linear-gradient(135deg, #0ea5e9, #6366f1)',
              borderRadius: 8, width: 34, height: 34,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <Code2 size={18} color="white" />
            </div>
            <span className="nav-logo-text">CodeViva</span>
          </Link>

          {/* Nav right */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {session ? (
              <>
                <Link href="/dashboard" className="btn-secondary" style={{ textDecoration: 'none', padding: '7px 14px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <LayoutDashboard size={15} />
                  <span className="nav-links-text">Dashboard</span>
                </Link>
                <Link href="/interview/new" className="btn-primary" style={{ textDecoration: 'none', padding: '7px 14px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <PlusCircle size={15} />
                  <span className="nav-links-text">New Interview</span>
                </Link>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 4 }}>
                  {session.user?.image && (
                    <Image
                      src={session.user.image}
                      alt={session.user.name ?? 'User'}
                      width={30} height={30}
                      style={{ borderRadius: '50%', border: '2px solid rgba(56,189,248,0.35)', flexShrink: 0 }}
                    />
                  )}
                  <button
                    onClick={() => signOut()}
                    title="Sign out"
                    style={{
                      background: 'transparent',
                      border: '1px solid rgba(248,113,113,0.25)',
                      borderRadius: 8, color: '#f87171',
                      cursor: 'pointer', padding: '6px',
                      display: 'flex', alignItems: 'center',
                    }}
                  >
                    <LogOut size={15} />
                  </button>
                </div>
              </>
            ) : (
              <button onClick={() => signIn('github')} className="btn-primary" style={{ padding: '9px 18px', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style={{ flexShrink: 0 }}>
                  <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
                </svg>
                <span className="nav-signin-text">Sign in with GitHub</span>
              </button>
            )}
          </div>
        </div>
      </nav>
    </>
  );
}