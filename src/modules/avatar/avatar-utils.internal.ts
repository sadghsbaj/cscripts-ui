import { t } from "../../shared/lang.internal.ts";
import type { AvatarSize, AvatarStatus } from "./index.ts";

/**
 * Computes a deterministic 32-bit FNV-1a hash for identity hue seeding.
 */
export function hashAvatarSeed(input: string): number {
    let hash = 0x81_1c_9d_c5;
    for (let i = 0; i < input.length; i += 1) {
        hash ^= input.codePointAt(i) ?? 0;
        hash = Math.imul(hash, 0x01_00_01_93);
    }
    return hash >>> 0;
}

/**
 * Maps a seed string to a deterministic OKLCH hue angle (`0`–`359`).
 */
export function resolveAvatarHue(seed: string): number {
    return hashAvatarSeed(seed) % 360;
}

/**
 * Extracts up to 1 initial at `xs` or 2 initials at `sm`–`xl`.
 * Uses codepoint-aware iteration so multi-byte characters are never split.
 */
export function extractAvatarInitials(
    name: string | undefined,
    explicitInitials: string | undefined,
    size: AvatarSize,
): string {
    const maxChars = size === "xs" ? 1 : 2;
    const custom = explicitInitials?.trim();
    if (custom) {
        return [...custom].slice(0, maxChars).join("").toUpperCase();
    }

    const normalized = name?.trim();
    if (!normalized) return "";

    const words = normalized.split(/\s+/).filter(Boolean);
    const firstWord = words[0];
    if (!firstWord) return "";

    if (maxChars === 1 || words.length === 1) {
        return [...firstWord].slice(0, maxChars).join("").toUpperCase();
    }

    const lastWord = words.at(-1);
    const firstChar = [...firstWord][0] ?? "";
    const lastChar = lastWord ? ([...lastWord][0] ?? "") : "";
    return `${firstChar}${lastChar}`.toUpperCase();
}

export function getAvatarStatusLabel(status: AvatarStatus): string {
    switch (status) {
        case "online": {
            return t({ de: "online", en: "online" });
        }
        case "busy": {
            return t({ de: "beschäftigt", en: "busy" });
        }
        case "away": {
            return t({ de: "abwesend", en: "away" });
        }
        case "offline": {
            return t({ de: "offline", en: "offline" });
        }
    }
}

export function getAvatarOverflowLabel(count: number): string {
    return t({ de: `${count} weitere`, en: `${count} more` });
}
