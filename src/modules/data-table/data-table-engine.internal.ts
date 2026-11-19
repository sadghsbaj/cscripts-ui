import { t } from "../../shared/lang.internal.ts";
import type {
    DataTableAlign,
    DataTableColumn,
    DataTableColumnFilter,
    DataTableColumnType,
    DataTableConditionOperator,
    DataTableFacetItem,
    DataTableFacetResult,
    DataTableSize,
    DataTableSortRule,
} from "./data-table.svelte.ts";

export const DATA_TABLE_ROW_HEIGHT_PX: Record<DataTableSize, number> = {
    xs: 28,
    sm: 36,
    md: 44,
    lg: 52,
};

export const DATA_TABLE_SELECTION_WIDTH_PX: Record<DataTableSize, number> = {
    xs: 36,
    sm: 40,
    md: 44,
    lg: 52,
};

export const DEFAULT_COLUMN_MIN_WIDTH = 120;
export const FACET_VIRTUALIZE_THRESHOLD = 200;
export const FACET_SEARCH_HIDE_THRESHOLD = 7;
export const ADAPTIVE_DEBOUNCE_ROW_THRESHOLD = 2000;
export const ADAPTIVE_DEBOUNCE_MS = 120;

export interface GridTrackSpec {
    width?: number | string;
    minWidth?: number;
    maxWidth?: number;
    selection?: boolean;
}

export interface CompiledGridTracks {
    gridColumns: string;
    minWidthPx: number;
}

export interface ComputeFacetsOptions {
    maxChecklistValues?: number;
    locale?: string;
    selectedKeys?: readonly string[];
}

type CompiledRowPredicate<TRow> = (row: TRow, sourceIndex: number) => boolean;

const collatorCache = new Map<string, Intl.Collator>();

const NUMERIC_TYPES = new Set<DataTableColumnType | undefined>(["number", "currency", "percent", "date", "datetime"]);
const NUMBER_LIKE_TYPES = new Set<DataTableColumnType | undefined>(["number", "currency", "percent"]);
const END_ALIGNED_TYPES = new Set<DataTableColumnType>(["number", "currency", "percent", "datetime"]);
const RANGE_COMPARISON_OPERATORS = new Set<DataTableConditionOperator>(["gt", "gte", "lt", "lte"]);

const TEXT_CONDITION_OPERATORS: readonly DataTableConditionOperator[] = [
    "contains",
    "notContains",
    "equals",
    "notEquals",
    "startsWith",
    "endsWith",
    "isEmpty",
    "isNotEmpty",
];

const NUMERIC_CONDITION_OPERATORS: readonly DataTableConditionOperator[] = [
    "equals",
    "notEquals",
    "gt",
    "gte",
    "lt",
    "lte",
    "between",
    "isEmpty",
    "isNotEmpty",
];

const BOOLEAN_CONDITION_OPERATORS: readonly DataTableConditionOperator[] = [
    "equals",
    "notEquals",
    "isEmpty",
    "isNotEmpty",
];

export function getCachedCollator(locale?: string): Intl.Collator {
    const cacheKey = locale ?? "__default__";
    const existing = collatorCache.get(cacheKey);
    if (existing) return existing;

    const collator = new Intl.Collator(locale, {
        numeric: true,
        sensitivity: "base",
    });
    collatorCache.set(cacheKey, collator);
    return collator;
}

export function isNumericColumnType(type?: DataTableColumnType): boolean {
    return NUMERIC_TYPES.has(type);
}

export function isNumberLikeType(type?: DataTableColumnType): boolean {
    return NUMBER_LIKE_TYPES.has(type);
}

export function isDateLikeType(type?: DataTableColumnType): boolean {
    return type === "date" || type === "datetime";
}

export function resolveColumnAlign<TRow>(column: Pick<DataTableColumn<TRow>, "align" | "type">): DataTableAlign {
    if (column.align) return column.align;
    const type = column.type ?? "text";
    if (END_ALIGNED_TYPES.has(type)) {
        return "end";
    }
    if (type === "boolean") {
        return "center";
    }
    return "start";
}

export function getDefaultConditionOperators(
    type: DataTableColumnType = "text"
): readonly DataTableConditionOperator[] {
    if (isNumberLikeType(type) || isDateLikeType(type)) {
        return NUMERIC_CONDITION_OPERATORS;
    }
    if (type === "boolean") {
        return BOOLEAN_CONDITION_OPERATORS;
    }
    return TEXT_CONDITION_OPERATORS;
}

export function isEmptyValue(value: unknown): boolean {
    if (value == null || value === "") return true;
    if (typeof value === "number" && Number.isNaN(value)) return true;
    if (value instanceof Date && Number.isNaN(value.getTime())) return true;
    return false;
}

export function extractColumnValue<TRow>(column: DataTableColumn<TRow>, row: TRow, sourceIndex: number): unknown {
    if (typeof column.accessor === "function") {
        return column.accessor(row, sourceIndex);
    }
    if (column.accessor !== undefined) {
        return row !== null && typeof row === "object"
            ? (row as Record<PropertyKey, unknown>)[column.accessor]
            : undefined;
    }
    return row !== null && typeof row === "object" ? (row as Record<string, unknown>)[column.id] : undefined;
}

export function formatColumnValue<TRow>(column: DataTableColumn<TRow>, value: unknown, row: TRow): string {
    if (column.format) {
        return column.format(value, row);
    }
    if (isEmptyValue(value)) {
        return "";
    }
    if (value instanceof Date) {
        return value.toISOString();
    }
    if (typeof value === "boolean") {
        return t(value ? { de: "Ja", en: "Yes" } : { de: "Nein", en: "No" });
    }
    return String(value);
}

export function toCanonicalValueKey<TRow>(column: DataTableColumn<TRow>, value: unknown, row: TRow): string {
    if (isEmptyValue(value)) return "";
    return formatColumnValue(column, value, row);
}

export function parseNumericValue(value: unknown): number | null {
    if (typeof value === "number") {
        return Number.isFinite(value) ? value : null;
    }
    if (typeof value === "string") {
        const trimmed = value.trim();
        if (trimmed === "") return null;
        // Strip common currency/percent/grouping symbols while preserving sign and decimal point.
        const cleaned = trimmed.replaceAll(/[\s$€£¥%]/g, "").replaceAll(",", "");
        if (cleaned === "") return null;
        const parsed = Number(cleaned);
        return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
}

const ISO_DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/;

export function parseDateTimestamp(value: unknown): number | null {
    if (value instanceof Date) {
        const ms = value.getTime();
        return Number.isNaN(ms) ? null : ms;
    }
    if (typeof value === "number") {
        return Number.isFinite(value) ? value : null;
    }
    if (typeof value === "string") {
        const trimmed = value.trim();
        if (trimmed === "") return null;
        const ms = Date.parse(trimmed);
        return Number.isNaN(ms) ? null : ms;
    }
    return null;
}

function toUtcDayKey(ms: number): number {
    const date = new Date(ms);
    return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

export function isFilterActive(filter: DataTableColumnFilter | null | undefined): boolean {
    if (!filter) return false;
    if (filter.kind === "values") {
        return filter.selected.length > 0;
    }
    if (filter.operator === "isEmpty" || filter.operator === "isNotEmpty") {
        return true;
    }
    if (filter.operator === "between") {
        return (filter.value?.trim() ?? "") !== "" || (filter.valueTo?.trim() ?? "") !== "";
    }
    return (filter.value?.trim() ?? "") !== "";
}

export function compileFilterPredicate<TRow>(
    column: DataTableColumn<TRow>,
    filter: DataTableColumnFilter
): CompiledRowPredicate<TRow> | null {
    if (filter.kind === "values") {
        if (filter.selected.length === 0) return null;
        const selectedSet = new Set(filter.selected);
        return (row, sourceIndex) => {
            const raw = extractColumnValue(column, row, sourceIndex);
            const key = toCanonicalValueKey(column, raw, row);
            return selectedSet.has(key);
        };
    }

    const { operator } = filter;

    if (operator === "isEmpty") {
        return (row, sourceIndex) => isEmptyValue(extractColumnValue(column, row, sourceIndex));
    }

    if (operator === "isNotEmpty") {
        return (row, sourceIndex) => !isEmptyValue(extractColumnValue(column, row, sourceIndex));
    }

    const type = column.type ?? "text";
    const rawQuery = filter.value?.trim() ?? "";
    const rawQueryTo = filter.valueTo?.trim() ?? "";

    if (operator === "between") {
        if (rawQuery === "" && rawQueryTo === "") return null;

        if (isDateLikeType(type)) {
            const startMs = rawQuery === "" ? null : parseDateTimestamp(rawQuery);
            const endMs = rawQueryTo === "" ? null : parseDateTimestamp(rawQueryTo);
            if (startMs === null && endMs === null) return () => false;

            const isStartDateOnly = ISO_DATE_ONLY_RE.test(rawQuery);
            const isEndDateOnly = ISO_DATE_ONLY_RE.test(rawQueryTo);
            const normalizedStart = startMs !== null && isStartDateOnly ? toUtcDayKey(startMs) : startMs;
            // Inclusive end-of-day bound when user enters a YYYY-MM-DD end date.
            const normalizedEnd = endMs !== null && isEndDateOnly ? toUtcDayKey(endMs) + 86_399_999 : endMs;

            return (row, sourceIndex) => {
                const ts = parseDateTimestamp(extractColumnValue(column, row, sourceIndex));
                if (ts === null) return false;
                if (normalizedStart !== null && ts < normalizedStart) return false;
                if (normalizedEnd !== null && ts > normalizedEnd) return false;
                return true;
            };
        }

        const minNum = rawQuery === "" ? null : parseNumericValue(rawQuery);
        const maxNum = rawQueryTo === "" ? null : parseNumericValue(rawQueryTo);
        if (minNum === null && maxNum === null) return () => false;

        return (row, sourceIndex) => {
            const num = parseNumericValue(extractColumnValue(column, row, sourceIndex));
            if (num === null) return false;
            if (minNum !== null && num < minNum) return false;
            if (maxNum !== null && num > maxNum) return false;
            return true;
        };
    }

    if (rawQuery === "") return null;

    if (RANGE_COMPARISON_OPERATORS.has(operator)) {
        if (isDateLikeType(type)) {
            const targetMs = parseDateTimestamp(rawQuery);
            if (targetMs === null) return () => false;
            const dateOnly = ISO_DATE_ONLY_RE.test(rawQuery);
            const boundStart = dateOnly ? toUtcDayKey(targetMs) : targetMs;
            const boundEnd = dateOnly ? boundStart + 86_399_999 : targetMs;

            return (row, sourceIndex) => {
                const ts = parseDateTimestamp(extractColumnValue(column, row, sourceIndex));
                if (ts === null) return false;
                if (operator === "gt") return ts > boundEnd;
                if (operator === "gte") return ts >= boundStart;
                if (operator === "lt") return ts < boundStart;
                return ts <= boundEnd;
            };
        }

        const targetNum = parseNumericValue(rawQuery);
        if (targetNum === null) return () => false;

        return (row, sourceIndex) => {
            const num = parseNumericValue(extractColumnValue(column, row, sourceIndex));
            if (num === null) return false;
            if (operator === "gt") return num > targetNum;
            if (operator === "gte") return num >= targetNum;
            if (operator === "lt") return num < targetNum;
            return num <= targetNum;
        };
    }

    if ((operator === "equals" || operator === "notEquals") && isNumberLikeType(type)) {
        const targetNum = parseNumericValue(rawQuery);
        if (targetNum !== null) {
            return (row, sourceIndex) => {
                const num = parseNumericValue(extractColumnValue(column, row, sourceIndex));
                const matches = num !== null && num === targetNum;
                return operator === "equals" ? matches : !matches;
            };
        }
    }

    if ((operator === "equals" || operator === "notEquals") && isDateLikeType(type)) {
        const targetMs = parseDateTimestamp(rawQuery);
        if (targetMs !== null) {
            const dateOnly = ISO_DATE_ONLY_RE.test(rawQuery);
            const targetDay = dateOnly ? toUtcDayKey(targetMs) : targetMs;
            return (row, sourceIndex) => {
                const ts = parseDateTimestamp(extractColumnValue(column, row, sourceIndex));
                const matches = ts !== null && (dateOnly ? toUtcDayKey(ts) === targetDay : ts === targetMs);
                return operator === "equals" ? matches : !matches;
            };
        }
    }

    const queryLower = rawQuery.toLowerCase();

    return (row, sourceIndex) => {
        const raw = extractColumnValue(column, row, sourceIndex);
        const formatted = isEmptyValue(raw) ? "" : formatColumnValue(column, raw, row).toLowerCase();
        switch (operator) {
            case "contains": {
                return formatted.includes(queryLower);
            }
            case "notContains": {
                return !formatted.includes(queryLower);
            }
            case "equals": {
                return formatted === queryLower;
            }
            case "notEquals": {
                return formatted !== queryLower;
            }
            case "startsWith": {
                return formatted.startsWith(queryLower);
            }
            case "endsWith": {
                return formatted.endsWith(queryLower);
            }
            default: {
                return true;
            }
        }
    };
}

function rowMatchesAllPredicates<TRow>(
    row: TRow,
    sourceIndex: number,
    predicates: readonly CompiledRowPredicate<TRow>[]
): boolean {
    for (const predicate of predicates) {
        if (!predicate(row, sourceIndex)) return false;
    }
    return true;
}

export function filterRowIndices<TRow>(
    data: readonly TRow[],
    columns: readonly DataTableColumn<TRow>[],
    filters: Readonly<Record<string, DataTableColumnFilter>>,
    excludeColumnId?: string
): number[] {
    const count = data.length;
    const filterEntries = Object.entries(filters);
    const hasRelevantFilter =
        filterEntries.length > 0 && (excludeColumnId === undefined || filterEntries.some(([id]) => id !== excludeColumnId));

    if (!hasRelevantFilter) {
        const all = Array.from<number>({ length: count });
        for (let i = 0; i < count; i++) {
            all[i] = i;
        }
        return all;
    }

    const columnMap = new Map<string, DataTableColumn<TRow>>();
    for (const column of columns) {
        columnMap.set(column.id, column);
    }

    const predicates: CompiledRowPredicate<TRow>[] = [];
    for (const [columnId, filter] of filterEntries) {
        if (columnId === excludeColumnId) continue;
        const column = columnMap.get(columnId);
        if (!column) continue;
        const predicate = compileFilterPredicate(column, filter);
        if (predicate) {
            predicates.push(predicate);
        }
    }

    if (predicates.length === 0) {
        const all = Array.from<number>({ length: count });
        for (let i = 0; i < count; i++) {
            all[i] = i;
        }
        return all;
    }

    const matched: number[] = [];
    for (let i = 0; i < count; i++) {
        const row = data[i];
        if (row !== undefined && rowMatchesAllPredicates(row, i, predicates)) {
            matched.push(i);
        }
    }

    return matched;
}

type SortKeyColumn<TRow> =
    | {
          kind: "custom";
          dir: 1 | -1;
          sortFn: (a: TRow, b: TRow) => number;
      }
    | {
          kind: "numeric";
          dir: 1 | -1;
          keys: (number | null)[];
      }
    | {
          kind: "text";
          dir: 1 | -1;
          keys: (string | null)[];
      };

function extractNumericSortKeys<TRow>(
    data: readonly TRow[],
    indices: readonly number[],
    column: DataTableColumn<TRow>,
    parser: (raw: unknown) => number | null
): (number | null)[] {
    const len = indices.length;
    const keys = Array.from<number | null>({ length: len });
    for (let pos = 0; pos < len; pos++) {
        const sourceIndex = indices[pos];
        const row = sourceIndex === undefined ? undefined : data[sourceIndex];
        if (sourceIndex === undefined || row === undefined) {
            keys[pos] = null;
        } else {
            const raw = extractColumnValue(column, row, sourceIndex);
            keys[pos] = isEmptyValue(raw) ? null : parser(raw);
        }
    }
    return keys;
}

function parseBooleanSortKey(raw: unknown): number | null {
    return typeof raw === "boolean" ? (raw ? 1 : 0) : null;
}

function extractTextSortKeys<TRow>(
    data: readonly TRow[],
    indices: readonly number[],
    column: DataTableColumn<TRow>
): (string | null)[] {
    const len = indices.length;
    const keys = Array.from<string | null>({ length: len });
    for (let pos = 0; pos < len; pos++) {
        const sourceIndex = indices[pos];
        const row = sourceIndex === undefined ? undefined : data[sourceIndex];
        if (sourceIndex === undefined || row === undefined) {
            keys[pos] = null;
        } else {
            const raw = extractColumnValue(column, row, sourceIndex);
            if (isEmptyValue(raw)) {
                keys[pos] = null;
            } else {
                const formatted = formatColumnValue(column, raw, row);
                keys[pos] = formatted === "" ? null : formatted;
            }
        }
    }
    return keys;
}

export function sortRowIndices<TRow>(
    data: readonly TRow[],
    indices: readonly number[],
    columns: readonly DataTableColumn<TRow>[],
    sorting: readonly DataTableSortRule[],
    locale?: string
): number[] {
    const len = indices.length;
    if (sorting.length === 0 || len <= 1) {
        return indices as number[];
    }

    const columnMap = new Map<string, DataTableColumn<TRow>>();
    for (const column of columns) {
        columnMap.set(column.id, column);
    }

    const prepared: SortKeyColumn<TRow>[] = [];
    let needsCollator = false;

    for (const rule of sorting) {
        const column = columnMap.get(rule.columnId);
        if (!column) continue;
        const dir: 1 | -1 = rule.direction === "asc" ? 1 : -1;

        if (column.sortFn) {
            prepared.push({ kind: "custom", dir, sortFn: column.sortFn });
            continue;
        }

        const type = column.type ?? "text";
        if (isNumberLikeType(type)) {
            prepared.push({
                kind: "numeric",
                dir,
                keys: extractNumericSortKeys(data, indices, column, parseNumericValue),
            });
            continue;
        }
        if (isDateLikeType(type)) {
            prepared.push({
                kind: "numeric",
                dir,
                keys: extractNumericSortKeys(data, indices, column, parseDateTimestamp),
            });
            continue;
        }
        if (type === "boolean") {
            prepared.push({
                kind: "numeric",
                dir,
                keys: extractNumericSortKeys(data, indices, column, parseBooleanSortKey),
            });
            continue;
        }

        needsCollator = true;
        prepared.push({
            kind: "text",
            dir,
            keys: extractTextSortKeys(data, indices, column),
        });
    }

    if (prepared.length === 0) {
        return indices as number[];
    }

    const collator = needsCollator ? getCachedCollator(locale) : null;
    const ruleCount = prepared.length;

    const positions = Array.from<number>({ length: len });
    for (let i = 0; i < len; i++) {
        positions[i] = i;
    }

    positions.sort((posA, posB) => {
        const idxA = indices[posA] ?? 0;
        const idxB = indices[posB] ?? 0;

        for (let r = 0; r < ruleCount; r++) {
            const col = prepared[r];
            if (!col) continue;

            if (col.kind === "custom") {
                const rowA = data[idxA];
                const rowB = data[idxB];
                if (rowA !== undefined && rowB !== undefined) {
                    const cmp = col.sortFn(rowA, rowB);
                    if (cmp !== 0) return cmp * col.dir;
                }
                continue;
            }

            if (col.kind === "numeric") {
                const a = col.keys[posA] ?? null;
                const b = col.keys[posB] ?? null;
                if (a === null && b === null) continue;
                if (a === null) return 1;
                if (b === null) return -1;
                if (a !== b) return a < b ? -col.dir : col.dir;
                continue;
            }

            const a = col.keys[posA] ?? null;
            const b = col.keys[posB] ?? null;
            if (a === null && b === null) continue;
            if (a === null) return 1;
            if (b === null) return -1;
            const cmp = collator ? collator.compare(a, b) : a < b ? -1 : a > b ? 1 : 0;
            if (cmp !== 0) return cmp * col.dir;
        }

        return idxA - idxB;
    });

    const sorted = Array.from<number>({ length: len });
    for (let i = 0; i < len; i++) {
        const pos = positions[i] ?? 0;
        sorted[i] = indices[pos] ?? 0;
    }

    return sorted;
}

export function computeColumnFacets<TRow>(
    data: readonly TRow[],
    columns: readonly DataTableColumn<TRow>[],
    filters: Readonly<Record<string, DataTableColumnFilter>>,
    targetColumnId: string,
    options?: ComputeFacetsOptions
): DataTableFacetResult {
    const targetColumn = columns.find((col) => col.id === targetColumnId);
    if (!targetColumn) {
        return { items: [], totalDistinct: 0, truncated: false };
    }

    const maxChecklistValues = options?.maxChecklistValues ?? 10_000;
    const selectedSet = options?.selectedKeys ? new Set(options.selectedKeys) : new Set<string>();
    const blankLabel = t({ de: "(Leer)", en: "(Blank)" });

    const crossFilteredIndices = filterRowIndices(data, columns, filters, targetColumnId);

    const buckets = new Map<
        string,
        {
            key: string;
            rawValue: unknown;
            label: string;
            count: number;
            isEmpty: boolean;
            sortNum: number | null;
        }
    >();

    const type = targetColumn.type ?? "text";
    const useNumericSort = isNumberLikeType(type) || isDateLikeType(type) || type === "boolean";
    let truncated = false;
    let overflowDistinct = 0;
    const overflowSeen = new Set<string>();

    for (const sourceIndex of crossFilteredIndices) {
        const row = data[sourceIndex];
        if (row === undefined) continue;

        const raw = extractColumnValue(targetColumn, row, sourceIndex);
        const empty = isEmptyValue(raw);
        const formatted = empty ? "" : formatColumnValue(targetColumn, raw, row);
        const isActuallyEmpty = empty || formatted === "";
        const key = isActuallyEmpty ? "" : formatted;

        const existing = buckets.get(key);
        if (existing) {
            existing.count += 1;
            continue;
        }

        // Always keep blank bucket and actively selected values even if capped.
        if (buckets.size >= maxChecklistValues && !isActuallyEmpty && !selectedSet.has(key)) {
            truncated = true;
            if (!overflowSeen.has(key)) {
                overflowSeen.add(key);
                overflowDistinct += 1;
            }
            continue;
        }

        let sortNum: number | null = null;
        if (!isActuallyEmpty && useNumericSort) {
            if (isNumberLikeType(type)) {
                sortNum = parseNumericValue(raw);
            } else if (isDateLikeType(type)) {
                sortNum = parseDateTimestamp(raw);
            } else if (type === "boolean") {
                sortNum = typeof raw === "boolean" ? (raw ? 1 : 0) : null;
            }
        }

        buckets.set(key, {
            key,
            rawValue: isActuallyEmpty ? null : raw,
            label: isActuallyEmpty ? blankLabel : formatted,
            count: 1,
            isEmpty: isActuallyEmpty,
            sortNum,
        });
    }

    const collator = getCachedCollator(options?.locale);
    const entries = buckets.values().toArray();

    entries.sort((a, b) => {
        if (a.isEmpty && b.isEmpty) return 0;
        if (a.isEmpty) return 1;
        if (b.isEmpty) return -1;

        if (useNumericSort && a.sortNum !== null && b.sortNum !== null && a.sortNum !== b.sortNum) {
            return a.sortNum < b.sortNum ? -1 : 1;
        }

        return collator.compare(a.label, b.label);
    });

    const items: DataTableFacetItem[] = entries.map((entry) => ({
        key: entry.key,
        rawValue: entry.rawValue,
        label: entry.label,
        count: entry.count,
        isEmpty: entry.isEmpty,
    }));

    return {
        items,
        totalDistinct: buckets.size + overflowDistinct,
        truncated,
    };
}

function parsePxLiteral(value: string): number | null {
    const trimmed = value.trim();
    if (!trimmed.endsWith("px")) return null;
    const numeric = Number(trimmed.slice(0, -2));
    return Number.isFinite(numeric) && numeric >= 0 ? numeric : null;
}

export function compileGridTracks(
    specs: readonly GridTrackSpec[],
    options: { size: DataTableSize; includeSelection?: boolean }
): CompiledGridTracks {
    const tracks: string[] = [];
    let minWidthPx = 0;

    if (options.includeSelection) {
        tracks.push("var(--cs-data-table-selection-width)");
        minWidthPx += DATA_TABLE_SELECTION_WIDTH_PX[options.size];
    }

    for (const spec of specs) {
        if (spec.selection) {
            tracks.push("var(--cs-data-table-selection-width)");
            minWidthPx += DATA_TABLE_SELECTION_WIDTH_PX[options.size];
            continue;
        }

        if (typeof spec.width === "number") {
            const resolved = Math.max(spec.minWidth ?? 0, spec.width);
            tracks.push(`${resolved}px`);
            minWidthPx += resolved;
            continue;
        }

        if (typeof spec.width === "string") {
            tracks.push(spec.width);
            minWidthPx += spec.minWidth ?? parsePxLiteral(spec.width) ?? DEFAULT_COLUMN_MIN_WIDTH;
            continue;
        }

        const min = spec.minWidth ?? DEFAULT_COLUMN_MIN_WIDTH;
        tracks.push(spec.maxWidth !== undefined ? `minmax(${min}px, ${spec.maxWidth}px)` : `minmax(${min}px, 1fr)`);
        minWidthPx += min;
    }

    return {
        gridColumns: tracks.join(" "),
        minWidthPx,
    };
}
