import type { Component, Snippet } from "svelte";
import type { HTMLAttributes, HTMLTdAttributes, HTMLThAttributes } from "svelte/elements";

import type {
    SegmentedControlIconComponentProps,
    SegmentedControlItemProps,
} from "../../modules/segmented-control/index.ts";

export { default as WorkAppDocs } from "./WorkAppDocs.svelte";
export { default as WorkAppDocsHeader } from "./WorkAppDocsHeader.svelte";
export { default as WorkAppDocsTabs } from "./WorkAppDocsTabs.svelte";
export { default as WorkAppDocsTab } from "./WorkAppDocsTab.svelte";
export { default as WorkAppDocsContent } from "./WorkAppDocsContent.svelte";
export { default as WorkAppDocsChapter } from "./WorkAppDocsChapter.svelte";
export { default as WorkAppDocsSection } from "./WorkAppDocsSection.svelte";
export { default as WorkAppDocsCallout } from "./WorkAppDocsCallout.svelte";
export { default as WorkAppDocsCardGrid } from "./WorkAppDocsCardGrid.svelte";
export { default as WorkAppDocsCard } from "./WorkAppDocsCard.svelte";
export { default as WorkAppDocsMark } from "./WorkAppDocsMark.svelte";
export { default as WorkAppDocsKbd } from "./WorkAppDocsKbd.svelte";
export { default as WorkAppDocsCode } from "./WorkAppDocsCode.svelte";
export { default as WorkAppDocsTable } from "./WorkAppDocsTable.svelte";
export { default as WorkAppDocsTableHead } from "./WorkAppDocsTableHead.svelte";
export { default as WorkAppDocsTableBody } from "./WorkAppDocsTableBody.svelte";
export { default as WorkAppDocsTableRow } from "./WorkAppDocsTableRow.svelte";
export { default as WorkAppDocsTableHeaderCell } from "./WorkAppDocsTableHeaderCell.svelte";
export { default as WorkAppDocsTableCell } from "./WorkAppDocsTableCell.svelte";

export const WORK_APP_DOCS_CALLOUT_VARIANTS = ["note", "tip", "caution"] as const;
export type WorkAppDocsCalloutVariant = (typeof WORK_APP_DOCS_CALLOUT_VARIANTS)[number];

export const WORK_APP_DOCS_MARK_TONES = ["accent", "caution"] as const;
export type WorkAppDocsMarkTone = (typeof WORK_APP_DOCS_MARK_TONES)[number];

export const WORK_APP_DOCS_SECTION_LEVELS = [2, 3] as const;
export type WorkAppDocsSectionLevel = (typeof WORK_APP_DOCS_SECTION_LEVELS)[number];

export const WORK_APP_DOCS_TABLE_ALIGNS = ["start", "center", "end"] as const;
export type WorkAppDocsTableAlign = (typeof WORK_APP_DOCS_TABLE_ALIGNS)[number];

export interface WorkAppDocsProps extends HTMLAttributes<HTMLDivElement> {
    ref?: HTMLDivElement | null;
    /** Bindable active chapter id. Defaults to `defaultChapter` or the first registered chapter. */
    activeChapter?: string;
    defaultChapter?: string;
    onChapterChange?: (id: string) => void;
    children?: Snippet;
}

export interface WorkAppDocsHeaderProps extends HTMLAttributes<HTMLElement> {
    ref?: HTMLElement | null;
    title: string;
    lead?: string;
    eyebrow?: string;
    children?: Snippet;
}

export interface WorkAppDocsTabsProps extends HTMLAttributes<HTMLDivElement> {
    ref?: HTMLDivElement | null;
    children?: Snippet;
}

export interface WorkAppDocsTabProps extends Omit<SegmentedControlItemProps<string>, "value"> {
    ref?: HTMLButtonElement | null;
    value: string;
    icon?: Component<SegmentedControlIconComponentProps>;
    children?: Snippet;
}

export interface WorkAppDocsContentProps extends HTMLAttributes<HTMLElement> {
    ref?: HTMLElement | null;
    children?: Snippet;
}

export interface WorkAppDocsChapterProps extends HTMLAttributes<HTMLElement> {
    ref?: HTMLElement | null;
    id: string;
    title: string;
    icon?: Component<SegmentedControlIconComponentProps>;
    lead?: string;
    children?: Snippet;
}

export interface WorkAppDocsSectionProps extends HTMLAttributes<HTMLElement> {
    ref?: HTMLElement | null;
    id?: string;
    title: string;
    lead?: string;
    level?: WorkAppDocsSectionLevel;
    children?: Snippet;
}

export interface WorkAppDocsCalloutProps extends HTMLAttributes<HTMLElement> {
    ref?: HTMLElement | null;
    variant: WorkAppDocsCalloutVariant;
    title?: string;
    icon?: Component | null;
    children?: Snippet;
}

export interface WorkAppDocsCardGridProps extends HTMLAttributes<HTMLDivElement> {
    ref?: HTMLDivElement | null;
    children?: Snippet;
}

export interface WorkAppDocsCardProps extends HTMLAttributes<HTMLDivElement> {
    ref?: HTMLDivElement | null;
    title: string;
    description?: string;
    icon?: Component;
    children?: Snippet;
}

export interface WorkAppDocsMarkProps extends HTMLAttributes<HTMLElement> {
    ref?: HTMLElement | null;
    tone?: WorkAppDocsMarkTone;
    children?: Snippet;
}

export interface WorkAppDocsKbdProps extends HTMLAttributes<HTMLElement> {
    ref?: HTMLElement | null;
    children?: Snippet;
}

export interface WorkAppDocsCodeProps extends HTMLAttributes<HTMLElement> {
    ref?: HTMLElement | null;
    children?: Snippet;
}

export interface WorkAppDocsTableProps extends HTMLAttributes<HTMLDivElement> {
    ref?: HTMLDivElement | null;
    caption?: string;
    children?: Snippet;
}

export interface WorkAppDocsTableHeadProps extends HTMLAttributes<HTMLTableSectionElement> {
    ref?: HTMLTableSectionElement | null;
    children?: Snippet;
}

export interface WorkAppDocsTableBodyProps extends HTMLAttributes<HTMLTableSectionElement> {
    ref?: HTMLTableSectionElement | null;
    children?: Snippet;
}

export interface WorkAppDocsTableRowProps extends HTMLAttributes<HTMLTableRowElement> {
    ref?: HTMLTableRowElement | null;
    children?: Snippet;
}

export interface WorkAppDocsTableHeaderCellProps extends Omit<HTMLThAttributes, "align"> {
    ref?: HTMLTableCellElement | null;
    align?: WorkAppDocsTableAlign;
    children?: Snippet;
}

export interface WorkAppDocsTableCellProps extends Omit<HTMLTdAttributes, "align"> {
    ref?: HTMLTableCellElement | null;
    align?: WorkAppDocsTableAlign;
    children?: Snippet;
}
