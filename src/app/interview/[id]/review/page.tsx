'use client';

import InterviewReview from '@/components/InterviewReview';

export default function ReviewPage({ params }: { params: { id: string } }) {
    return <InterviewReview mode="saved" sessionId={params.id} />;
}
