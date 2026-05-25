'use client';

import InterviewWorkspace from '@/components/InterviewWorkspace';

export default function InterviewPage({ params }: { params: { id: string } }) {
    return <InterviewWorkspace mode="saved" sessionId={params.id} />;
}
