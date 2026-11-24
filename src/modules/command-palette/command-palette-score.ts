import type { CommandPaletteFilterCandidate } from "./index.ts";

const WORD_BOUNDARY_CODES = new Set([32, 45, 95, 47, 46, 58]);

function isWordBoundary(text: string, index: number): boolean {
    if (index <= 0) return true;
    const prev = text.codePointAt(index - 1);
    if (prev === undefined) return true;
    return WORD_BOUNDARY_CODES.has(prev);
}

function scoreFieldToken(field: string, token: string, exact: number, prefix: number, boundary: number, sub: number): number {
    if (!field) return 0;
    if (field === token) return exact;
    if (field.startsWith(token)) return prefix;

    const index = field.indexOf(token);
    if (index === -1) return 0;

    return isWordBoundary(field, index) ? boundary : sub;
}

/**
 * Deterministic multi-token scorer for command palette filtering and ranking.
 * Returns `> 0` when all whitespace-delimited query tokens match, or `0` otherwise.
 */
export function scoreCommandPaletteMatch(query: string, candidate: CommandPaletteFilterCandidate): number {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return 1;

    const label = candidate.label.toLowerCase();
    const value = candidate.value.toLowerCase();
    const groupLabel = candidate.groupLabel?.toLowerCase() ?? "";
    const keywords = candidate.keywords?.map((kw) => kw.toLowerCase()) ?? [];

    const tokens = normalizedQuery.split(/\s+/);
    let totalScore = 0;

    for (const token of tokens) {
        if (!token) continue;

        let bestTokenScore = scoreFieldToken(label, token, 100, 80, 65, 45);

        for (const kw of keywords) {
            const kwScore = scoreFieldToken(kw, token, 60, 45, 35, 25);
            if (kwScore > bestTokenScore) {
                bestTokenScore = kwScore;
            }
        }

        if (groupLabel) {
            const groupScore = scoreFieldToken(groupLabel, token, 25, 20, 16, 12);
            if (groupScore > bestTokenScore) {
                bestTokenScore = groupScore;
            }
        }

        if (value && value !== label) {
            const valueScore = scoreFieldToken(value, token, 20, 16, 12, 10);
            if (valueScore > bestTokenScore) {
                bestTokenScore = valueScore;
            }
        }

        if (bestTokenScore === 0) return 0;
        totalScore += bestTokenScore;
    }

    // Bonus for matching the complete normalized phrase directly against the primary label.
    if (label === normalizedQuery) {
        totalScore += 120;
    } else if (label.startsWith(normalizedQuery)) {
        totalScore += 60;
    } else if (label.includes(normalizedQuery)) {
        totalScore += 30;
    }

    return totalScore;
}
