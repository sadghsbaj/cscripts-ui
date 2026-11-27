import { t } from "../../shared/lang.internal.ts";
import type {
    WorkConflictField,
    WorkConflictKind,
    WorkConflictPathSegment,
} from "./index.ts";

export type FormattedConflictValueState = "value" | "empty" | "deleted";

export interface FormattedConflictValue {
    text: string;
    state: FormattedConflictValueState;
}

const MAX_INLINE_ARRAY_ITEMS = 3;
const MAX_INLINE_OBJECT_ENTRIES = 2;
const MAX_SUMMARY_LENGTH = 64;

function humanizeSegment(raw: string): string {
    const spaced = raw
        .replaceAll(/[_-]+/g, " ")
        .replaceAll(/([a-z0-9])([A-Z])/g, "$1 $2")
        .replaceAll(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
        .replaceAll(/\s+/g, " ")
        .trim();

    if (spaced.length === 0) return raw;
    return `${spaced.slice(0, 1).toUpperCase()}${spaced.slice(1)}`;
}

function formatPathSegment(segment: WorkConflictPathSegment): string {
    switch (segment.kind) {
        case "prop": {
            return humanizeSegment(segment.key);
        }
        case "index": {
            return `#${segment.index + 1}`;
        }
        case "array-item": {
            return String(segment.keyValue);
        }
    }
}

function unescapePointerSegment(segment: string): string {
    return segment.replaceAll("~1", "/").replaceAll("~0", "~");
}

function formatPointer(pointer: string): string {
    const trimmed = pointer.trim();
    if (trimmed.length === 0 || trimmed === "/") return "";

    const parts = trimmed
        .replace(/^\/+/, "")
        .split("/")
        .filter((part) => part.length > 0)
        .map((part) => {
            const unescaped = unescapePointerSegment(part);
            if (/^\d+$/.test(unescaped)) {
                return `#${Number(unescaped) + 1}`;
            }
            return humanizeSegment(unescaped);
        });

    return parts.join(" › ");
}

export function formatConflictFieldLabel(field: WorkConflictField): string {
    const explicitLabel = field.label?.trim();
    if (explicitLabel && explicitLabel.length > 0) {
        return explicitLabel;
    }

    if (field.segments && field.segments.length > 0) {
        return field.segments.map((segment) => formatPathSegment(segment)).join(" › ");
    }

    if (field.path && field.path.length > 0) {
        return field.path
            .map((part) => (typeof part === "number" ? `#${part + 1}` : humanizeSegment(part)))
            .join(" › ");
    }

    if (field.pointer) {
        const formattedPointer = formatPointer(field.pointer);
        if (formattedPointer.length > 0) {
            return formattedPointer;
        }
    }

    return humanizeSegment(field.id);
}

export function formatConflictKindHint(kind: WorkConflictKind | undefined): string | null {
    switch (kind) {
        case "delete-edit": {
            return t({ de: "Gelöscht & geändert", en: "Deleted & edited" });
        }
        case "type-mismatch": {
            return t({ de: "Format geändert", en: "Format changed" });
        }
        case "duplicate-array-key": {
            return t({ de: "Doppelter Eintrag", en: "Duplicate entry" });
        }
        default: {
            return null;
        }
    }
}

function isInlinePrimitive(value: unknown): value is string | number | boolean {
    return typeof value === "string" || typeof value === "number" || typeof value === "boolean";
}

function formatPrimitiveInline(value: string | number | boolean): string {
    if (typeof value === "boolean") {
        return t(value ? { de: "Ja", en: "Yes" } : { de: "Nein", en: "No" });
    }
    return String(value);
}

function formatArrayValue(values: readonly unknown[]): FormattedConflictValue {
    if (values.length === 0) {
        return { text: t({ de: "Leer", en: "Empty" }), state: "empty" };
    }

    if (values.every((item) => isInlinePrimitive(item))) {
        const preview = values
            .slice(0, MAX_INLINE_ARRAY_ITEMS)
            .map((item) => formatPrimitiveInline(item))
            .join(", ");
        const suffix =
            values.length > MAX_INLINE_ARRAY_ITEMS
                ? ` (+${values.length - MAX_INLINE_ARRAY_ITEMS})`
                : "";
        const combined = `${preview}${suffix}`;

        if (combined.length <= MAX_SUMMARY_LENGTH) {
            return { text: combined, state: "value" };
        }
    }

    return {
        text: t({
            de: values.length === 1 ? "1 Eintrag" : `${values.length} Einträge`,
            en: values.length === 1 ? "1 item" : `${values.length} items`,
        }),
        state: "value",
    };
}

function formatObjectValue(value: object): FormattedConflictValue {
    if (value instanceof Date) {
        if (Number.isNaN(value.getTime())) {
            return { text: t({ de: "Ungültiges Datum", en: "Invalid date" }), state: "value" };
        }
        return { text: value.toISOString().slice(0, 10), state: "value" };
    }

    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length === 0) {
        return { text: t({ de: "Leer", en: "Empty" }), state: "empty" };
    }

    const primitiveEntries = entries.filter(([, entryValue]) => isInlinePrimitive(entryValue));
    if (primitiveEntries.length === entries.length && entries.length <= MAX_INLINE_OBJECT_ENTRIES) {
        const summary = primitiveEntries
            .map(([key, entryValue]) => {
                const formatted = isInlinePrimitive(entryValue)
                    ? formatPrimitiveInline(entryValue)
                    : "";
                return `${humanizeSegment(key)}: ${formatted}`;
            })
            .join(", ");

        if (summary.length <= MAX_SUMMARY_LENGTH) {
            return { text: summary, state: "value" };
        }
    }

    return {
        text: t({
            de: entries.length === 1 ? "1 Feld" : `${entries.length} Felder`,
            en: entries.length === 1 ? "1 field" : `${entries.length} fields`,
        }),
        state: "value",
    };
}

export function formatConflictValue(value: unknown): FormattedConflictValue {
    if (value === undefined) {
        return { text: t({ de: "Gelöscht", en: "Removed" }), state: "deleted" };
    }

    if (value === null) {
        return { text: t({ de: "Leer", en: "Empty" }), state: "empty" };
    }

    if (typeof value === "string") {
        if (value.trim().length === 0) {
            return { text: t({ de: "Leer", en: "Empty" }), state: "empty" };
        }
        return { text: value, state: "value" };
    }

    if (typeof value === "boolean") {
        return {
            text: t(value ? { de: "Ja", en: "Yes" } : { de: "Nein", en: "No" }),
            state: "value",
        };
    }

    if (typeof value === "number") {
        return { text: String(value), state: "value" };
    }

    if (Array.isArray(value)) {
        return formatArrayValue(value);
    }

    if (typeof value === "object") {
        return formatObjectValue(value);
    }

    return { text: String(value), state: "value" };
}
