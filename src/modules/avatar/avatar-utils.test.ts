import { describe, expect, test } from "vitest";

import {
    extractAvatarInitials,
    getAvatarOverflowLabel,
    getAvatarStatusLabel,
    hashAvatarSeed,
    resolveAvatarHue,
} from "./avatar-utils.internal.ts";
import { AVATAR_SIZES, AVATAR_STATUSES } from "./index.ts";

describe("avatar-utils.internal", () => {
    describe("hashAvatarSeed & resolveAvatarHue", () => {
        test("hashAvatarSeed is deterministic and returns an unsigned 32-bit integer", () => {
            const first = hashAvatarSeed("ada-lovelace");
            const second = hashAvatarSeed("ada-lovelace");
            const other = hashAvatarSeed("grace-hopper");

            expect(first).toBe(second);
            expect(first).not.toBe(other);
            expect(Number.isSafeInteger(first)).toBe(true);
            expect(first).toBeGreaterThanOrEqual(0);
            expect(first).toBeLessThanOrEqual(0xff_ff_ff_ff);
        });

        test("resolveAvatarHue is deterministic and stays within 0..359", () => {
            const samples = ["", "a", "Ada Lovelace", "user_42", "👩🏾‍💻", "x".repeat(120)];
            for (const sample of samples) {
                const hue = resolveAvatarHue(sample);
                expect(hue).toBe(resolveAvatarHue(sample));
                expect(Number.isSafeInteger(hue)).toBe(true);
                expect(hue).toBeGreaterThanOrEqual(0);
                expect(hue).toBeLessThan(360);
            }
        });
    });

    describe("extractAvatarInitials", () => {
        test("returns empty string when both name and explicit initials are empty or whitespace", () => {
            expect(extractAvatarInitials(undefined, undefined, "md")).toBe("");
            expect(extractAvatarInitials(" ".repeat(3), " ".repeat(2), "md")).toBe("");
        });

        test("caps to 1 character at xs and 2 characters at sm..xl", () => {
            expect(extractAvatarInitials("Ada Lovelace", undefined, "xs")).toBe("A");
            for (const size of AVATAR_SIZES) {
                if (size === "xs") continue;
                expect(extractAvatarInitials("Ada Lovelace", undefined, size)).toBe("AL");
            }
        });

        test("handles single-word, multi-word, and extra whitespace names", () => {
            expect(extractAvatarInitials("Ada", undefined, "md")).toBe("AD");
            expect(extractAvatarInitials("X", undefined, "md")).toBe("X");
            expect(extractAvatarInitials("   Ada    Augusta   King  ", undefined, "md")).toBe("AK");
            expect(extractAvatarInitials("   Ada    Augusta   King  ", undefined, "xs")).toBe("A");
        });

        test("explicit initials override name, trim, uppercase, and respect size cap", () => {
            expect(extractAvatarInitials("Ada Lovelace", "  xy z ", "md")).toBe("XY");
            expect(extractAvatarInitials("Ada Lovelace", "  xy ", "xs")).toBe("X");
            expect(extractAvatarInitials("Ada Lovelace", " ".repeat(3), "md")).toBe("AL");
        });

        test("slices by Unicode codepoint without splitting multi-byte characters", () => {
            expect(extractAvatarInitials("🚀 Launch", undefined, "xs")).toBe("🚀");
            expect(extractAvatarInitials("🚀 Launch", undefined, "md")).toBe("🚀L");
            expect(extractAvatarInitials("Über Özgür", undefined, "md")).toBe("ÜÖ");
        });
    });

    describe("localized labels", () => {
        test("returns non-empty status and overflow labels", () => {
            for (const status of AVATAR_STATUSES) {
                expect(getAvatarStatusLabel(status)).toBeTruthy();
            }
            expect(getAvatarOverflowLabel(3)).toBe("3 more");
        });
    });
});
