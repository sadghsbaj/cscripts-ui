import { describe, expect, test } from "vitest";

import {
    formatFileSize,
    matchesAccept,
    resolveRejectionMessage,
    validateFiles,
} from "./upload-area.internal.ts";

function makeFile(name: string, size: number, type = "application/octet-stream"): File {
    const content = size > 0 ? new Uint8Array(size) : new Uint8Array(0);
    return new File([content], name, { type });
}

describe("upload-area.internal", () => {
    describe("formatFileSize", () => {
        test("formats bytes below 1 KB", () => {
            expect(formatFileSize(0)).toBe("0 B");
            expect(formatFileSize(512)).toBe("512 B");
            expect(formatFileSize(1023)).toBe("1023 B");
        });

        test("formats kilobytes with rounding", () => {
            expect(formatFileSize(1024)).toBe("1 KB");
            expect(formatFileSize(1536)).toBe("2 KB");
            expect(formatFileSize(500 * 1024)).toBe("500 KB");
        });

        test("formats megabytes and strips trailing .0", () => {
            expect(formatFileSize(1024 * 1024)).toBe("1 MB");
            expect(formatFileSize(1.5 * 1024 * 1024)).toBe("1.5 MB");
            expect(formatFileSize(2 * 1024 * 1024)).toBe("2 MB");
        });

        test("formats gigabytes and strips trailing .0", () => {
            expect(formatFileSize(1024 * 1024 * 1024)).toBe("1 GB");
            expect(formatFileSize(2.5 * 1024 * 1024 * 1024)).toBe("2.5 GB");
        });
    });

    describe("matchesAccept", () => {
        test("returns true when accept is undefined, empty, or whitespace/commas only", () => {
            const file = makeFile("doc.pdf", 10, "application/pdf");
            expect(matchesAccept(file, undefined)).toBe(true);
            expect(matchesAccept(file, "")).toBe(true);
            expect(matchesAccept(file, " ".repeat(3))).toBe(true);
            expect(matchesAccept(file, " , , ")).toBe(true);
        });

        test("matches file extensions case-insensitively", () => {
            const pdf = makeFile("Report.PDF", 10, "");
            const tar = makeFile("archive.tar.gz", 10, "application/gzip");

            expect(matchesAccept(pdf, ".pdf")).toBe(true);
            expect(matchesAccept(pdf, ".PDF")).toBe(true);
            expect(matchesAccept(pdf, ".png")).toBe(false);
            expect(matchesAccept(tar, ".tar.gz")).toBe(true);
        });

        test("matches exact MIME types case-insensitively", () => {
            const pdf = makeFile("doc.pdf", 10, "application/pdf");
            expect(matchesAccept(pdf, "application/pdf")).toBe(true);
            expect(matchesAccept(pdf, "APPLICATION/PDF")).toBe(true);
            expect(matchesAccept(pdf, "text/plain")).toBe(false);
        });

        test("matches wildcard MIME types like image/*", () => {
            const png = makeFile("photo.png", 10, "image/png");
            const svg = makeFile("icon.svg", 10, "image/svg+xml");
            const pdf = makeFile("doc.pdf", 10, "application/pdf");

            expect(matchesAccept(png, "image/*")).toBe(true);
            expect(matchesAccept(svg, "IMAGE/*")).toBe(true);
            expect(matchesAccept(pdf, "image/*")).toBe(false);
        });

        test("matches comma-separated mixed lists of extensions, wildcards, and exact MIMEs", () => {
            const accept = "image/*, .pdf, text/plain";

            expect(matchesAccept(makeFile("a.jpg", 10, "image/jpeg"), accept)).toBe(true);
            expect(matchesAccept(makeFile("b.pdf", 10, ""), accept)).toBe(true);
            expect(matchesAccept(makeFile("c.txt", 10, "text/plain"), accept)).toBe(true);
            expect(matchesAccept(makeFile("d.zip", 10, "application/zip"), accept)).toBe(false);
        });
    });

    describe("validateFiles", () => {
        test("validates accept filter and reports type rejections", () => {
            const valid = makeFile("photo.png", 100, "image/png");
            const invalid = makeFile("notes.txt", 100, "text/plain");

            const result = validateFiles([valid, invalid], {
                accept: "image/*",
                multiple: true,
                currentCount: 0,
            });

            expect(result.accepted).toEqual([valid]);
            expect(result.rejections).toEqual([{ file: invalid, reason: "type" }]);
        });

        test("validates maxSize inclusive boundary and reports size rejections", () => {
            const exact = makeFile("exact.png", 100, "image/png");
            const tooBig = makeFile("big.png", 101, "image/png");

            const result = validateFiles([exact, tooBig], {
                maxSize: 100,
                multiple: true,
                currentCount: 0,
            });

            expect(result.accepted).toEqual([exact]);
            expect(result.rejections).toEqual([{ file: tooBig, reason: "size" }]);
        });

        test("in single-file mode (multiple: false), takes first valid file and rejects extras as count", () => {
            const badType = makeFile("bad.txt", 50, "text/plain");
            const firstValid = makeFile("first.png", 50, "image/png");
            const secondValid = makeFile("second.png", 50, "image/png");

            const result = validateFiles([badType, firstValid, secondValid], {
                accept: "image/*",
                multiple: false,
                currentCount: 1,
            });

            expect(result.accepted).toEqual([firstValid]);
            expect(result.rejections).toEqual([
                { file: badType, reason: "type" },
                { file: secondValid, reason: "count" },
            ]);
        });

        test("in multi-file mode, subtracts currentCount from maxFiles", () => {
            const f1 = makeFile("a.png", 50, "image/png");
            const f2 = makeFile("b.png", 50, "image/png");
            const f3 = makeFile("c.png", 50, "image/png");

            const result = validateFiles([f1, f2, f3], {
                multiple: true,
                maxFiles: 3,
                currentCount: 2,
            });

            expect(result.accepted).toEqual([f1]);
            expect(result.rejections).toEqual([
                { file: f2, reason: "count" },
                { file: f3, reason: "count" },
            ]);
        });

        test("rejects all incoming files when currentCount already meets maxFiles", () => {
            const f1 = makeFile("a.png", 50, "image/png");

            const result = validateFiles([f1], {
                multiple: true,
                maxFiles: 2,
                currentCount: 2,
            });

            expect(result.accepted).toEqual([]);
            expect(result.rejections).toEqual([{ file: f1, reason: "count" }]);
        });
    });

    describe("resolveRejectionMessage", () => {
        const dummyFile = makeFile("test.txt", 10, "text/plain");

        test("resolves type rejection message", () => {
            expect(resolveRejectionMessage({ file: dummyFile, reason: "type" }, {})).toBe(
                "File type not supported",
            );
        });

        test("resolves size rejection message with and without maxSize", () => {
            expect(
                resolveRejectionMessage(
                    { file: dummyFile, reason: "size" },
                    { maxSize: 5 * 1024 * 1024 },
                ),
            ).toBe("File exceeds 5 MB");
            expect(resolveRejectionMessage({ file: dummyFile, reason: "size" }, {})).toBe(
                "File is too large",
            );
        });

        test("resolves count rejection message with and without maxFiles", () => {
            expect(
                resolveRejectionMessage({ file: dummyFile, reason: "count" }, { maxFiles: 3 }),
            ).toBe("Maximum 3 files");
            expect(resolveRejectionMessage({ file: dummyFile, reason: "count" }, {})).toBe(
                "Only one file allowed",
            );
        });
    });
});
