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
 */
export const authOptions: AuthOptions = {
    providers,
    secret: process.env.NEXTAUTH_SECRET,
    session: {
        strategy: 'jwt',
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
