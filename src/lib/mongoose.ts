import mongoose from 'mongoose';

/**
 * We use a global cache to prevent creating a new connection on every
 * hot-reload during development (Next.js reloads modules frequently).
 */
declare global {
    // eslint-disable-next-line no-var
    var mongoose: { conn: mongoose.Connection | null; promise: Promise<mongoose.Connection> | null };
}

let cached = global.mongoose;

if (!cached) {
    cached = global.mongoose = { conn: null, promise: null };
}

async function connectDB(): Promise<mongoose.Connection> {
    // If we already have a connection, reuse it
    if (cached.conn) {
        return cached.conn;
    }

    // If a connection is being established, wait for it
    if (!cached.promise) {
        const MONGODB_URL = process.env.MONGODB_URL;
        if (!MONGODB_URL) throw new Error('Please define MONGODB_URL in your .env.local file');
        cached.promise = mongoose
            .connect(MONGODB_URL, { bufferCommands: false })
            .then((m) => m.connection);
    }


    cached.conn = await cached.promise;
    return cached.conn;
}

export default connectDB;
