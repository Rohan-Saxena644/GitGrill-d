import mongoose, { Schema, Document, Model } from 'mongoose';
import {
    TaggedFile,
    FocusArea,
    Question,
    Answer,
    SessionStatus,
    InterviewStyle,
    DifficultyPreset,
    InterviewTrack,
    SystemTopic,
} from '@/types';

// The shape of a Session document in MongoDB
export interface ISessionDoc extends Document {
    userId: string;
    repoUrl: string;
    repoOwner: string;
    repoName: string;
    resumeContext?: string;
    taggedFiles: TaggedFile[];
    focusAreas: FocusArea[];
    interviewTrack?: InterviewTrack;
    systemTopics?: SystemTopic[];
    interviewStyle?: InterviewStyle;
    difficultyPreset?: DifficultyPreset;
    questions: Question[];
    answers: Answer[];
    status: SessionStatus;
    createdAt: Date;
    updatedAt: Date;
}

const SessionSchema = new Schema<ISessionDoc>(
    {
        userId: { type: String, required: true, index: true },
        repoUrl: { type: String, required: true },
        repoOwner: { type: String, required: true },
        repoName: { type: String, required: true },
        resumeContext: { type: String },

        taggedFiles: [
            {
                path: String,
                tag: { type: String, enum: ['core-logic', 'boilerplate', 'config', 'tests', 'untagged'] },
                content: String,
            },
        ],

        focusAreas: [{ type: String }],
        interviewTrack: { type: String, enum: ['repo-viva', 'systems'], default: 'repo-viva' },
        systemTopics: [{ type: String }],
        interviewStyle: { type: String, enum: ['practice', 'interview'], default: 'practice' },
        difficultyPreset: {
            type: String,
            enum: ['beginner-friendly', 'balanced', 'challenging'],
            default: 'balanced',
        },

        questions: [
            {
                type: { type: String, enum: ['mcq', 'short-answer', 'descriptive'], default: 'mcq' },
                text: String,
                category: String,
                difficulty: { type: String, enum: ['Easy', 'Medium', 'Hard'] },
                options: [String],
                correctAnswerIndex: Number,
                explanation: String,
                userDifficulty: { type: String, enum: ['Easy', 'Medium', 'Hard'] },
            },
        ],

        answers: [
            {
                questionIndex: Number,
                text: String,
                selectedOptionIndex: Number,
                isCorrect: Boolean,
                score: Number,
                feedback: String,
                aiAnswer: String,
                userNote: String,
            },
        ],

        status: {
            type: String,
            enum: ['draft', 'active', 'completed'],
            default: 'draft',
        },
    },
    {
        timestamps: true, // auto-adds createdAt and updatedAt
    }
);

// Prevent model re-compilation on hot reload (Next.js dev mode)
const Session: Model<ISessionDoc> =
    mongoose.models.Session ?? mongoose.model<ISessionDoc>('Session', SessionSchema);

export default Session;
