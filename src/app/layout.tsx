import type { Metadata } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import Providers from '@/components/Providers';
import Navbar from '@/components/Navbar';
import './globals.css';

export const metadata: Metadata = {
    title: 'Code Interviewer — AI Interview Prep From Your Own Code',
    description:
        'Paste your GitHub repo URL, tag your key files, and get personalized AI interview questions based on code YOU actually wrote.',
};

export default async function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await getServerSession(authOptions);

    return (
        <html lang="en">
            <body>
                <Providers session={session}>
                    <Navbar />
                    <main>{children}</main>
                </Providers>
            </body>
        </html>
    );
}
