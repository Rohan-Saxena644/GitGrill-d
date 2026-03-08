import NextAuth from 'next-auth';
import { authOptions } from '@/lib/auth';

// This single file handles all NextAuth routes:
// GET/POST /api/auth/signin, /api/auth/signout, /api/auth/callback/github, etc.
const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
