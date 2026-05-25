'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import {
    clearGuestSession,
    GUEST_SESSION_IDLE_MS,
    readGuestSession,
    touchGuestSession,
} from '@/lib/guest-session';

export default function GuestSessionManager() {
    const { status } = useSession();

    useEffect(() => {
        if (status !== 'unauthenticated') return;

        const syncActivity = () => {
            if (readGuestSession()) {
                touchGuestSession();
            }
        };

        const interval = window.setInterval(() => {
            const guestSession = readGuestSession();
            if (!guestSession) return;

            if (guestSession.expiresAt <= Date.now()) {
                clearGuestSession();
                if (window.location.pathname.startsWith('/interview/guest')) {
                    window.location.href = '/interview/new';
                }
            }
        }, 30_000);

        window.addEventListener('click', syncActivity);
        window.addEventListener('keydown', syncActivity);
        window.addEventListener('mousemove', syncActivity);
        window.addEventListener('scroll', syncActivity);

        return () => {
            window.clearInterval(interval);
            window.removeEventListener('click', syncActivity);
            window.removeEventListener('keydown', syncActivity);
            window.removeEventListener('mousemove', syncActivity);
            window.removeEventListener('scroll', syncActivity);
        };
    }, [status]);

    useEffect(() => {
        if (status === 'authenticated') {
            const guestSession = readGuestSession();
            if (guestSession && Date.now() - guestSession.lastActiveAt > GUEST_SESSION_IDLE_MS) {
                clearGuestSession();
            }
        }
    }, [status]);

    return null;
}
