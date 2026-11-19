import { t } from "../../shared/lang.internal.ts";
import type { UploadAreaRejection } from "./index.ts";

export interface ValidateFilesOptions {
    accept?: string;
    maxSize?: number;
    maxFiles?: number;
    multiple: boolean;
    currentCount: number;
}

export interface ValidateFilesResult {
    accepted: File[];
    rejections: UploadAreaRejection[];
}

export function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    if (bytes < 1024 * 1024 * 1024) {
        return `${(bytes / (1024 * 1024)).toFixed(1).replace(/\.0$/, "")} MB`;
    }
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1).replace(/\.0$/, "")} GB`;
}

export function matchesAccept(file: File, accept?: string): boolean {
    const trimmed = accept?.trim();
    if (!trimmed) return true;

    const tokens = trimmed
        .split(",")
        .map((token) => token.trim().toLowerCase())
        .filter((token) => token.length > 0);

    if (tokens.length === 0) return true;

    const fileName = file.name.toLowerCase();
    const fileType = file.type.toLowerCase();

    return tokens.some((token) => {
        if (token.startsWith(".")) {
            return fileName.endsWith(token);
        }
        if (token.endsWith("/*")) {
            const prefix = token.slice(0, -1);
            return fileType.startsWith(prefix);
        }
        return fileType === token;
    });
}

export function validateFiles(incoming: File[], options: ValidateFilesOptions): ValidateFilesResult {
    const accepted: File[] = [];
    const rejections: UploadAreaRejection[] = [];

    for (const file of incoming) {
        if (!options.multiple && accepted.length > 0) {
            rejections.push({ file, reason: "count" });
            continue;
        }
        if (!matchesAccept(file, options.accept)) {
            rejections.push({ file, reason: "type" });
            continue;
        }
        if (options.maxSize !== undefined && file.size > options.maxSize) {
            rejections.push({ file, reason: "size" });
            continue;
        }
        if (
            options.multiple &&
            options.maxFiles !== undefined &&
            options.currentCount + accepted.length >= options.maxFiles
        ) {
            rejections.push({ file, reason: "count" });
            continue;
        }
        accepted.push(file);
    }

    return { accepted, rejections };
}

export function resolveRejectionMessage(
    rejection: UploadAreaRejection,
    options: { maxSize?: number; maxFiles?: number },
): string {
    switch (rejection.reason) {
        case "type": {
            return t({
                de: "Dateityp nicht unterstützt",
                en: "File type not supported",
            });
        }
        case "size": {
            if (options.maxSize !== undefined) {
                const limit = formatFileSize(options.maxSize);
                return t({
                    de: `Datei größer als ${limit}`,
                    en: `File exceeds ${limit}`,
                });
            }
            return t({
                de: "Datei ist zu groß",
                en: "File is too large",
            });
        }
        case "count": {
            if (options.maxFiles !== undefined) {
                return t({
                    de: `Maximal ${options.maxFiles} Dateien`,
                    en: `Maximum ${options.maxFiles} files`,
                });
            }
            return t({
                de: "Nur eine Datei erlaubt",
                en: "Only one file allowed",
            });
        }
    }
}
