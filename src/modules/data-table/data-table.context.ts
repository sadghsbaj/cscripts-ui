import { createContext } from "svelte";

import type { GridTrackSpec } from "./data-table-engine.internal.ts";
import type {
    DataTableColorMode,
    DataTableController,
    DataTableRole,
    DataTableSize,
    DataTableVariant,
} from "./data-table.svelte.ts";

export interface DataTableHeaderRegistration extends GridTrackSpec {
    id: symbol;
    columnId?: string;
    pinned?: "start" | "end";
    element?: HTMLElement | null;
}

export interface DataTableContext<TRow = unknown> {
    readonly variant: DataTableVariant;
    readonly size: DataTableSize;
    readonly role: DataTableRole;
    readonly striped: boolean;
    readonly gridlines: boolean;
    readonly wrap: boolean;
    readonly colorMode: DataTableColorMode;
    readonly popoverId: string;
    readonly table: DataTableController<TRow> | undefined;
    readonly viewportEl: HTMLDivElement | null;
    readonly statusBarDockEl: HTMLDivElement | null;
    readonly hasPinnedStart: boolean;
    readonly hasPinnedEnd: boolean;
    readonly statusBarVisible: boolean;
    readonly setStatusBarVisible: (visible: boolean) => void;
    readonly registerHeaderCell: (entry: DataTableHeaderRegistration) => () => void;
    readonly updateHeaderCell: (id: symbol, patch: Partial<Omit<DataTableHeaderRegistration, "id">>) => void;
    readonly registerHeaderTrigger: (columnId: string, el: HTMLElement | null) => () => void;
    readonly registerColumnPopoverEl: (el: HTMLElement | null) => () => void;
    readonly openColumnPopover: (columnId: string, triggerEl?: HTMLElement | null) => void;
    readonly closeColumnPopover: (options?: { restoreFocus?: boolean }) => void;
    readonly handleHeaderTriggerPointerDown: (columnId: string, event: PointerEvent, triggerEl: HTMLElement) => void;
    readonly handleHeaderTriggerClick: (columnId: string, event: MouseEvent, triggerEl: HTMLElement) => void;
    readonly handleHeaderTriggerKeyDown: (columnId: string, event: KeyboardEvent, triggerEl: HTMLElement) => void;
    readonly isPopoverOpenFor: (columnId: string) => boolean;
    readonly scrollToColumn: (columnId: string, options?: { behavior?: ScrollBehavior }) => void;
    readonly isSwitchingPopover: () => boolean;
    readonly markPopoverClosedFromNative: (restoreFocus: boolean) => void;
}

const [getRawDataTableContext, setRawDataTableContext, hasDataTableContext] = createContext<unknown>();

export function setDataTableContext<TRow = unknown>(context: DataTableContext<TRow>): DataTableContext<TRow> {
    setRawDataTableContext(context);
    return context;
}

export function getDataTableContext<TRow = unknown>(): DataTableContext<TRow> {
    return getRawDataTableContext() as DataTableContext<TRow>;
}

export { hasDataTableContext };
