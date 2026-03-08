import mongoose, { Schema, Document, Model } from 'mongoose';
import { TaggedFile, FocusArea, Question, Answer, SessionStatus } from '@/types';

// The shape of a Session document in MongoDB
export interface ISessionDoc extends Document {
    userId: string;
    repoUrl: string;
    repoOwner: string;
    repoName: string;
    taggedFiles: TaggedFile[];
    focusAreas: FocusArea[];
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

        taggedFiles: [
            {
                path: String,
                tag: { type: String, enum: ['core-logic', 'boilerplate', 'config', 'tests', 'untagged'] },
                content: String,
            },
        ],

        focusAreas: [{ type: String }],

        questions: [
            {
                text: String,
                category: String,
                difficulty: { type: String, enum: ['Easy', 'Medium', 'Hard'] },
                userDifficulty: { type: String, enum: ['Easy', 'Medium', 'Hard'] },
            },
        ],

        answers: [
            {
                questionIndex: Number,
                text: String,
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
