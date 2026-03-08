import { NextRequest, NextResponse } from 'next/server';
import { parseGithubUrl, getRepoFileTree } from '@/lib/github';

// POST /api/repo/files
// Body: { repoUrl: string }
// Returns: { owner, repo, files: GitHubFile[] }
export async function POST(req: NextRequest) {
    const body = await req.json();
    const { repoUrl } = body;

    if (!repoUrl || typeof repoUrl !== 'string') {
        return NextResponse.json({ error: 'repoUrl is required' }, { status: 400 });
    }

    try {
        const { owner, repo } = parseGithubUrl(repoUrl);
        const files = await getRepoFileTree(owner, repo);

        // Filter out very large/binary files unlikely to be useful
        const filtered = files.filter((f) => {
            const ext = f.path.split('.').pop()?.toLowerCase() ?? '';
            const skip = ['png', 'jpg', 'jpeg', 'gif', 'svg', 'ico', 'woff', 'woff2', 'ttf', 'mp4', 'zip', 'lock'];
            return !skip.includes(ext);
        });

        return NextResponse.json({ owner, repo, files: filtered });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to fetch repository';
        return NextResponse.json({ error: message }, { status: 400 });
    }
}
