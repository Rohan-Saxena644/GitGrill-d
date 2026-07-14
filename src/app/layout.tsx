import type { Metadata } from 'next';
import { Analytics } from '@vercel/analytics/next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import Providers from '@/components/Providers';
import Navbar from '@/components/Navbar';
import './globals.css';

export const metadata: Metadata = {
    title: "GitGrill'd - AI Interview Prep From Your Own Code",
    description:
        'Paste your GitHub repo URL, tag the important files, and get 10 realistic MCQ-style interview questions based on code you actually wrote.',
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
                <Analytics />
            </body>
        </html>
    );
}
