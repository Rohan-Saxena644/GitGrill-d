import { AuthOptions } from 'next-auth';
import GithubProvider from 'next-auth/providers/github';
import GoogleProvider from 'next-auth/providers/google';

const providers = [];

if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
    providers.push(
        GithubProvider({
            clientId: process.env.GITHUB_CLIENT_ID,
            clientSecret: process.env.GITHUB_CLIENT_SECRET,
        })
    );
}

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    providers.push(
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        })
    );
}

/**
 * NextAuth configuration.
 * Supports GitHub and Google when their env vars are configured.
 * The user's provider id, name, email, and avatar are stored in the session.
 *
 * --- Session lifetime: "logged out when you leave the site" --------------
 * NextAuth's defaults use a *persistent* cookie (one with a Max-Age), which
 * survives browser restarts and keeps renewing itself on every visit — so a
 * user can stay logged in for months without ever re-authenticating. That's
 * convenient, but it's the opposite of what's being asked for here: log the
 * user out once they leave, so re-login is required every time.
 *
 * The mechanism for that is a *session cookie* — a cookie issued with no
 * Max-Age/Expires attribute at all. Per the cookie spec, browsers delete
 * session cookies automatically when the browser application is fully
 * closed (all windows, not just one tab) — this is the standard way "log
 * out when you leave the site" is implemented anywhere on the web, since
 * there is no reliable way for a server to detect "the user closed the
 * tab" directly (browsers don't dependably notify servers of that, and
 * there's no request happening at that moment to act on).
 *
 * Practically: closing this tab while another tab/window of the same
 * browser stays open will NOT log the user out (the cookie is shared
 * browser-wide, by design — that's also why two tabs of the same browser
 * stay in sync). Closing the entire browser application does log them out;
 * their next visit requires signing in again. Switching tabs, refreshing,
 * or the computer sleeping does NOT log them out — only fully quitting the
 * browser does.
 *
 * The `maxAge` values below are also shortened (1 hour) purely as a safety
 * backstop in case a browser/OS combination keeps a process alive in the
 * background indefinitely (some mobile OSes do this) — so even then, the
 * session can't outlive an hour of inactivity.
 */
const SESSION_MAX_AGE = 60 * 60; // 1 hour safety backstop; see comment above

// Note on duplicate accounts: there's no separate "users" table — userId
// (used to scope saved Sessions in MongoDB) is just token.sub, which NextAuth
// sets from the OAuth profile's stable id (Google's profile.sub / GitHub's
// numeric profile.id). Re-signing in with the same Google account always
// yields the same userId, so one Google account can't end up with two
// separate sets of saved sessions.

export const authOptions: AuthOptions = {
    providers,
    secret: process.env.NEXTAUTH_SECRET,
    session: {
        strategy: 'jwt',
        maxAge: SESSION_MAX_AGE,
        updateAge: 0, // re-issue the token (and its cookie) on every request, see below
    },
    jwt: {
        maxAge: SESSION_MAX_AGE,
    },
    cookies: {
        sessionToken: {
            name: `next-auth.session-token`,
            options: {
                httpOnly: true,
                sameSite: 'lax',
                path: '/',
                secure: process.env.NEXTAUTH_URL?.startsWith('https://') ?? false,
                // Omitting maxAge entirely makes this a session cookie: the
                // browser drops it when fully closed, instead of persisting
                // it to disk for `maxAge` like a normal login cookie would.
            },
        },
    },
    callbacks: {
        async jwt({ token }) {
            if (token.sub) {
                token.userId = token.sub;
            }
            return token;
        },
        async session({ session, token }) {
            if (session.user && token.userId) {
                (session.user as { userId?: string }).userId = token.userId as string;
            }
            return session;
        },
    },
    pages: {
        signIn: '/',
    },
};