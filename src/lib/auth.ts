import { AuthOptions } from 'next-auth';
import GithubProvider from 'next-auth/providers/github';

/**
 * NextAuth configuration.
 * Uses GitHub as the only OAuth provider.
 * The user's GitHub id, name, email, and avatar are stored in the session.
 */
export const authOptions: AuthOptions = {
    providers: [
        GithubProvider({
            clientId: process.env.GITHUB_CLIENT_ID!,
            clientSecret: process.env.GITHUB_CLIENT_SECRET!,
        }),
    ],

    secret: process.env.NEXTAUTH_SECRET,

    session: {
        strategy: 'jwt', // JSON Web Token — no extra DB table needed
    },

    callbacks: {
        // Attach the underlying provider account ID (sub) to the JWT
        async jwt({ token }) {
            if (token.sub) {
                token.userId = token.sub;
            }
            return token;
        },

        // Expose userId on the client-side session object
        async session({ session, token }) {
            if (session.user && token.userId) {
                (session.user as { userId?: string }).userId = token.userId as string;
            }
            return session;
        },
    },

    pages: {
        signIn: '/', // redirect to landing page if not signed in
    },
};
