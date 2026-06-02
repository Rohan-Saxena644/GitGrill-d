import { FileTag, GitHubFile } from '@/types';

const TEST_PATTERNS = [
    /(^|\/)__tests__(\/|$)/i,
    /(^|\/)(test|tests|specs)(\/|$)/i,
    /\.(test|spec)\.(ts|tsx|js|jsx)$/i,
];

const CONFIG_PATTERNS = [
    /(^|\/)\.env/i,
    /(^|\/)(tsconfig|jsconfig|next\.config|tailwind\.config|postcss\.config|eslint\.config|prettier|babel\.config|vite\.config|jest\.config)/i,
    /(^|\/)(package-lock\.json|package\.json|pnpm-lock\.yaml|yarn\.lock)$/i,
];

const BOILERPLATE_PATTERNS = [
    /(^|\/)(public|assets)(\/|$)/i,
    /(^|\/)(README|LICENSE|CHANGELOG)/i,
    /(^|\/)(layout|loading|error|not-found)\.(ts|tsx|js|jsx)$/i,
    /(^|\/)(types|constants)(\/|$)/i,
];

const CORE_PATTERNS = [
    /(^|\/)(api|lib|services|service|controllers|controller|hooks|store|reducers|utils|models)(\/|$)/i,
    /(^|\/)(actions|server|repositories|repository|db)(\/|$)/i,
    /(^|\/)(page|route)\.(ts|tsx|js|jsx)$/i,
];

export function suggestFileTag(path: string): FileTag {
    if (TEST_PATTERNS.some((pattern) => pattern.test(path))) {
        return 'tests';
    }

    if (CONFIG_PATTERNS.some((pattern) => pattern.test(path))) {
        return 'config';
    }

    if (CORE_PATTERNS.some((pattern) => pattern.test(path))) {
        return 'core-logic';
    }

    if (BOILERPLATE_PATTERNS.some((pattern) => pattern.test(path))) {
        return 'boilerplate';
    }

    return 'untagged';
}

export function buildSuggestedTags(files: GitHubFile[]) {
    return files.reduce<Record<string, FileTag>>((acc, file) => {
        acc[file.path] = suggestFileTag(file.path);
        return acc;
    }, {});
}
