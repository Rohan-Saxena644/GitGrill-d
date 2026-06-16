'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useSession, signIn, signOut } from 'next-auth/react';
import { Chrome, Code2, Github, LayoutDashboard, LogOut, PlusCircle } from 'lucide-react';
import { clearGuestSession } from '@/lib/guest-session';

export default function Navbar() {
    const { data: session } = useSession();

    return (
        <>
            <style>{`
        .nav-logo-text {
          font-family: var(--font-display);
          font-weight: 600;
          font-size: 1.08rem;
          letter-spacing: -0.01em;
          background: linear-gradient(135deg, #e8825a 0%, #f0a878 100%);
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

            <nav
                style={{
                    background: 'rgba(21,17,14,0.88)',
                    backdropFilter: 'blur(14px)',
                    borderBottom: '1px solid rgba(212,150,110,0.1)',
                    position: 'sticky',
                    top: 0,
                    zIndex: 100,
                    padding: '0 16px',
                }}
            >
                <div
                    style={{
                        maxWidth: 1200,
                        margin: '0 auto',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        height: 60,
                    }}
                >
                    <Link
                        href="/"
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 9,
                            textDecoration: 'none',
                            flexShrink: 0,
                        }}
                    >
                        <div
                            style={{
                                background: 'linear-gradient(135deg, #e8825a, #c4633d)',
                                borderRadius: 9,
                                width: 34,
                                height: 34,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                                boxShadow: '0 4px 14px -4px rgba(232,130,90,0.45)',
                            }}
                        >
                            <Code2 size={18} color="#20160e" />
                        </div>
                        <span className="nav-logo-text">GitGrill&apos;d</span>
                    </Link>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {session ? (
                            <>
                                <Link
                                    href="/dashboard"
                                    className="btn-secondary"
                                    style={{
                                        textDecoration: 'none',
                                        padding: '7px 14px',
                                        fontSize: '0.82rem',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 6,
                                    }}
                                >
                                    <LayoutDashboard size={15} />
                                    <span className="nav-links-text">Dashboard</span>
                                </Link>
                                <Link
                                    href="/interview/new"
                                    className="btn-primary"
                                    style={{
                                        textDecoration: 'none',
                                        padding: '7px 14px',
                                        fontSize: '0.82rem',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 6,
                                    }}
                                >
                                    <PlusCircle size={15} />
                                    <span className="nav-links-text">New Interview</span>
                                </Link>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 4 }}>
                                    {session.user?.image && (
                                        <Image
                                            src={session.user.image}
                                            alt={session.user.name ?? 'User'}
                                            width={30}
                                            height={30}
                                            style={{
                                                borderRadius: '50%',
                                                border: '2px solid rgba(232,130,90,0.35)',
                                                flexShrink: 0,
                                            }}
                                        />
                                    )}
                                    <button
                                        onClick={() => {
                                            clearGuestSession();
                                            signOut();
                                        }}
                                        title="Sign out"
                                        style={{
                                            background: 'transparent',
                                            border: '1px solid rgba(216,101,79,0.25)',
                                            borderRadius: 8,
                                            color: '#d8654f',
                                            cursor: 'pointer',
                                            padding: '6px',
                                            display: 'flex',
                                            alignItems: 'center',
                                        }}
                                    >
                                        <LogOut size={15} />
                                    </button>
                                </div>
                            </>
                        ) : (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <button
                                    onClick={() => signIn('google')}
                                    className="btn-secondary"
                                    style={{ padding: '9px 14px', fontSize: '0.84rem' }}
                                >
                                    <Chrome size={15} />
                                    <span className="nav-signin-text">Google</span>
                                </button>
                                <button
                                    onClick={() => signIn('github')}
                                    className="btn-primary"
                                    style={{ padding: '9px 14px', fontSize: '0.84rem' }}
                                >
                                    <Github size={15} />
                                    <span className="nav-signin-text">GitHub</span>
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </nav>
        </>
    );
}