'use client';

import { SessionProvider } from 'next-auth/react';
import { Session } from 'next-auth';

/**
 * Client-side wrapper that provides the NextAuth session to all child components.
 * Lives in its own file because SessionProvider is a client component,
 * but our root layout is a server component.
 */
export default function Providers({
    children,
    session,
}: {
    children: React.ReactNode;
    session: Session | null;
}) {
    return <SessionProvider session={session}>{children}</SessionProvider>;
}
