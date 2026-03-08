/**
 * GitHub API helpers — fetches the file tree and file contents
 * for a public repository using the unauthenticated REST API.
 *
 * Rate limit: 60 requests/hour for unauthenticated calls.
 */

export interface GitHubFile {
    path: string;
    type: 'blob' | 'tree';
    size?: number;
}

/**
 * Parses a GitHub URL like:
 *   https://github.com/owner/repo
 *   https://github.com/owner/repo/tree/main
 * and returns { owner, repo }.
 */
export function parseGithubUrl(url: string): { owner: string; repo: string } {
    const clean = url.replace(/\/$/, '').replace('https://github.com/', '');
    const parts = clean.split('/');
    if (parts.length < 2) throw new Error('Invalid GitHub URL');
    return { owner: parts[0], repo: parts[1] };
}

/**
 * Fetches the full recursive file tree for a public GitHub repo.
 * Uses the Git Trees API with recursive=1 to get all files at once.
 */
export async function getRepoFileTree(owner: string, repo: string): Promise<GitHubFile[]> {
    // First, get the default branch
    const repoRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
        headers: { Accept: 'application/vnd.github+json' },
        next: { revalidate: 0 },
    });

    if (!repoRes.ok) {
        const data = await repoRes.json();
        throw new Error(data.message ?? 'Failed to fetch repository info');
    }

    const repoData = await repoRes.json();
    const defaultBranch: string = repoData.default_branch ?? 'main';

    // Get the full recursive tree
    const treeRes = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/git/trees/${defaultBranch}?recursive=1`,
        { headers: { Accept: 'application/vnd.github+json' }, next: { revalidate: 0 } }
    );

    if (!treeRes.ok) {
        const data = await treeRes.json();
        throw new Error(data.message ?? 'Failed to fetch file tree');
    }

    const treeData = await treeRes.json();

    // Return only files (blobs), not directories (trees)
    return (treeData.tree as GitHubFile[]).filter((item) => item.type === 'blob');
}

/**
 * Fetches the raw content of a single file from a public GitHub repo.
 * Returns the file content as a string, or null if it fails.
 */
export async function getFileContent(
    owner: string,
    repo: string,
    path: string
): Promise<string | null> {
    const res = await fetch(
        `https://raw.githubusercontent.com/${owner}/${repo}/HEAD/${path}`,
        { next: { revalidate: 0 } }
    );

    if (!res.ok) return null;

    const text = await res.text();
    // Truncate very large files to avoid overwhelming the AI prompt
    return text.length > 8000 ? text.slice(0, 8000) + '\n\n[... file truncated ...]' : text;
}
