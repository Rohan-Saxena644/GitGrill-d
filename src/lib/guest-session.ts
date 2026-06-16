import { GuestSessionState, ISession } from '@/types';

export const GUEST_SESSION_KEY = 'gitgrilld_guest_session';
export const GUEST_SESSION_IDLE_MS = 15 * 60 * 1000;

function isBrowser() {
    return typeof window !== 'undefined';
}

export function createGuestSession(session: ISession): GuestSessionState {
    const now = Date.now();

    return {
        ...session,
        _id: 'guest',
        mode: 'guest',
        lastActiveAt: now,
        expiresAt: now + GUEST_SESSION_IDLE_MS,
    };
}

export function readGuestSession(): GuestSessionState | null {
    if (!isBrowser()) return null;

    const raw = window.localStorage.getItem(GUEST_SESSION_KEY);
    if (!raw) return null;

    try {
        const parsed = JSON.parse(raw) as GuestSessionState;
        if (!parsed?.questions || !Array.isArray(parsed.questions) || parsed.questions.length === 0) {
            clearGuestSession();
            return null;
        }
        if (parsed.expiresAt <= Date.now()) {
            clearGuestSession();
            return null;
        }
        return parsed;
    } catch {
        clearGuestSession();
        return null;
    }
}

export function saveGuestSession(session: GuestSessionState) {
    if (!isBrowser()) return;
    window.localStorage.setItem(GUEST_SESSION_KEY, JSON.stringify(session));
}

export function clearGuestSession() {
    if (!isBrowser()) return;
    window.localStorage.removeItem(GUEST_SESSION_KEY);
}

export function touchGuestSession() {
    const session = readGuestSession();
    if (!session) return null;

    const now = Date.now();
    const updated = {
        ...session,
        lastActiveAt: now,
        expiresAt: now + GUEST_SESSION_IDLE_MS,
    };
    saveGuestSession(updated);
    return updated;
}