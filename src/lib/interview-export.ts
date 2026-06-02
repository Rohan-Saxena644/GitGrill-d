import { buildInterviewInsights } from '@/lib/interview-insights';
import { GuestSessionState, ISession, QuestionType } from '@/types';

function formatQuestionType(type: QuestionType) {
    if (type === 'mcq') return 'MCQ';
    if (type === 'short-answer') return 'Short Answer';
    return 'Descriptive';
}

function formatDate(date?: Date | string) {
    if (!date) return 'Unknown';
    return new Date(date).toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    });
}

export function buildInterviewMarkdown(session: ISession | GuestSessionState) {
    const insights = buildInterviewInsights(session);
    const correctCount = session.answers.filter((answer) => answer.isCorrect).length;
    const mcqCount = session.questions.filter((question) => question.type === 'mcq').length;
    const avgScore =
        session.answers.length > 0
            ? session.answers.reduce((sum, answer) => sum + (answer.score ?? 0), 0) / session.answers.length
            : 0;

    const lines: string[] = [
        `# CodeViva Review Export`,
        ``,
        `- Track: ${session.interviewTrack === 'systems' ? 'Systems Track' : 'Repo Viva'}`,
        `- Title: ${
            session.interviewTrack === 'systems'
                ? 'Real-World Engineering'
                : `${session.repoOwner}/${session.repoName}`
        }`,
        `- Status: ${session.status}`,
        `- Created: ${formatDate(session.createdAt)}`,
        `- Average score: ${avgScore.toFixed(1)}/10`,
        `- MCQ accuracy: ${mcqCount > 0 ? `${correctCount}/${mcqCount}` : 'n/a'}`,
        `- Focus areas: ${session.focusAreas.join(', ') || 'None selected'}`,
    ];

    if (session.interviewTrack === 'systems') {
        lines.push(`- Systems topics: ${(session.systemTopics ?? []).join(', ') || 'None selected'}`);
    }

    if (session.interviewStyle) {
        lines.push(`- Interview style: ${session.interviewStyle}`);
    }

    if (session.difficultyPreset) {
        lines.push(`- Difficulty preset: ${session.difficultyPreset}`);
    }

    if (session.resumeContext?.trim()) {
        lines.push('', `## Resume Context`, '', session.resumeContext.trim());
    }

    lines.push('', `## Insights`, '');
    lines.push(
        `- Strongest category: ${
            insights.strongestCategory
                ? `${insights.strongestCategory.label} (${insights.strongestCategory.avgScore}/10)`
                : 'Not enough answers yet'
        }`
    );
    lines.push(
        `- Weakest category: ${
            insights.weakestCategory
                ? `${insights.weakestCategory.label} (${insights.weakestCategory.avgScore}/10)`
                : 'Not enough answers yet'
        }`
    );
    lines.push(
        `- Felt hardest most often: ${
            insights.hardestCategory
                ? `${insights.hardestCategory.label} (${insights.hardestCategory.hardCount} question${
                      insights.hardestCategory.hardCount === 1 ? '' : 's'
                  })`
                : 'No questions were marked hard'
        }`
    );

    if (insights.typeBreakdown.length > 0) {
        lines.push('', `### Score by Question Type`, '');
        for (const entry of insights.typeBreakdown) {
            lines.push(`- ${entry.label}: ${entry.avgScore}/10 across ${entry.answered} answer${entry.answered === 1 ? '' : 's'}`);
        }
    }

    if (insights.categoryBreakdown.length > 0) {
        lines.push('', `### Score by Category`, '');
        for (const entry of insights.categoryBreakdown) {
            lines.push(`- ${entry.label}: ${entry.avgScore}/10 across ${entry.answered} answer${entry.answered === 1 ? '' : 's'}`);
        }
    }

    lines.push('', `## Question Review`, '');

    session.questions.forEach((question, index) => {
        const answer = session.answers.find((entry) => entry.questionIndex === index);
        const correctOption =
            question.type === 'mcq' && typeof question.correctAnswerIndex === 'number'
                ? question.options?.[question.correctAnswerIndex]
                : undefined;
        const selectedOption =
            question.type === 'mcq' && typeof answer?.selectedOptionIndex === 'number'
                ? question.options?.[answer.selectedOptionIndex]
                : undefined;

        lines.push(`### Q${index + 1}. ${question.text}`);
        lines.push('');
        lines.push(`- Type: ${formatQuestionType(question.type)}`);
        lines.push(`- Category: ${question.category}`);
        lines.push(`- Difficulty: ${question.difficulty}`);
        if (question.userDifficulty) {
            lines.push(`- Felt difficulty: ${question.userDifficulty}`);
        }

        if (question.type === 'mcq' && question.options?.length) {
            lines.push('', `Options:`);
            question.options.forEach((option, optionIndex) => {
                const label = String.fromCharCode(65 + optionIndex);
                lines.push(`- ${label}. ${option}`);
            });
        }

        lines.push('');
        lines.push(`Your answer: ${question.type === 'mcq' ? selectedOption ?? 'No option selected' : answer?.text ?? 'No answer submitted'}`);

        if (question.type === 'mcq' && correctOption) {
            lines.push(`Correct option: ${correctOption}`);
        }

        if (answer?.score !== undefined) {
            lines.push(`Score: ${answer.score}/10`);
        }

        if (answer?.feedback) {
            lines.push(`Feedback: ${answer.feedback}`);
        }

        if (answer?.aiAnswer) {
            lines.push(`Interview-ready answer: ${answer.aiAnswer}`);
        } else {
            lines.push(`Interview-ready answer: ${question.explanation}`);
        }

        if (answer?.userNote) {
            lines.push(`Your note: ${answer.userNote}`);
        }

        lines.push('');
    });

    return lines.join('\n');
}
