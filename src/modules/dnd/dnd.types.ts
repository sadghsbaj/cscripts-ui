import type { Attachment } from "svelte/attachments";

export const DND_STATUSES = ["idle", "pending", "dragging", "settling"] as const;
export const DND_LAYOUTS = ["free", "list", "grid", "tree"] as const;
export const DND_ORIENTATIONS = ["vertical", "horizontal"] as const;
export const DND_DROP_POSITIONS = ["before", "inside", "after"] as const;
export const DND_AXES = ["both", "x", "y"] as const;
export const DND_INPUT_METHODS = ["pointer", "keyboard"] as const;
export const DND_CANCEL_REASONS = ["escape", "pointer-cancel", "invalid-drop", "programmatic"] as const;

export type DndStatus = (typeof DND_STATUSES)[number];
export type DndLayout = (typeof DND_LAYOUTS)[number];
export type DndOrientation = (typeof DND_ORIENTATIONS)[number];
export type DndDropPosition = (typeof DND_DROP_POSITIONS)[number];
export type DndAxis = (typeof DND_AXES)[number];
export type DndInputMethod = (typeof DND_INPUT_METHODS)[number];
export type DndCancelReason = (typeof DND_CANCEL_REASONS)[number];

export type DndId = string | number;

export interface DndPoint {
    x: number;
    y: number;
}

export interface DragActivationOptions {
    /**
     * Euclidean pointer travel in px required to transition `pending -> dragging`.
     * @default 6
     */
    distance?: number;
    /**
     * Press-and-hold duration in ms before activating drag.
     * When `> 0`, pointer drift must remain within `tolerance` px.
     * @default 0
     */
    delay?: number;
    /**
     * Maximum pointer drift in px allowed while `delay` timer is running.
     * @default 6
     */
    tolerance?: number;
    /**
     * Blocks body-level drag initiation on nested interactive elements (`button`, `a[href]`, `input`, etc.).
     * @default true
     */
    ignoreInteractive?: boolean;
}

export interface DndAutoScrollOptions {
    /**
     * Scroll activation zone thickness in px (auto-clamped to `<= 25%` of container dimension).
     * @default 48
     */
    edgeSize?: number;
    /**
     * Minimum auto-scroll velocity in px/s at the outer edge of the zone.
     * @default 60
     */
    minSpeed?: number;
    /**
     * Maximum auto-scroll velocity in px/s flush against the container edge.
     * @default 900
     */
    maxSpeed?: number;
    /**
     * Suppresses scrolling toward an edge that the pointer already occupied at drag start
     * until the pointer leaves that zone or moves deeper toward the edge.
     * @default true
     */
    initialEdgeGuard?: boolean;
}

export interface DndActiveItem<TData = unknown> {
    id: DndId;
    type: string | undefined;
    data: TData;
    containerId: DndId | null;
    index: number | null;
    originContainerId: DndId | null;
    originIndex: number | null;
    label: string;
}

export interface DndOverTarget<TDropData = unknown> {
    droppableId: DndId;
    itemId: DndId | null;
    containerId: DndId | null;
    index: number | null;
    position: DndDropPosition | null;
    isValid: boolean;
    data: TDropData | undefined;
}

export interface DndDragStartEvent<TData = unknown> {
    item: DndActiveItem<TData>;
    inputMethod: DndInputMethod;
    pointer: DndPoint | null;
}

export interface DndDragMoveEvent<TData = unknown> {
    item: DndActiveItem<TData>;
    pointer: DndPoint | null;
    delta: DndPoint;
}

export interface DndDragOverEvent<TData = unknown, TDropData = unknown> {
    item: DndActiveItem<TData>;
    over: DndOverTarget<TDropData> | null;
}

export interface DndReorderEvent<TData = unknown> {
    item: DndActiveItem<TData>;
    fromContainerId: DndId;
    toContainerId: DndId;
    fromIndex: number;
    toIndex: number;
}

export interface DndDropEvent<TData = unknown, TDropData = unknown> {
    item: DndActiveItem<TData>;
    droppableId: DndId;
    droppableData: TDropData | undefined;
    originContainerId: DndId | null;
    originIndex: number | null;
    targetContainerId: DndId | null;
    targetIndex: number | null;
    targetItemId: DndId | null;
    position: DndDropPosition | null;
    didMove: boolean;
}

export interface DndDragCancelEvent<TData = unknown> {
    item: DndActiveItem<TData>;
    originContainerId: DndId | null;
    originIndex: number | null;
    currentContainerId: DndId | null;
    currentIndex: number | null;
    reason: DndCancelReason;
}

export interface DndDragEndEvent<TData = unknown, TDropData = unknown> {
    item: DndActiveItem<TData>;
    over: DndOverTarget<TDropData> | null;
    dropped: boolean;
    cancelReason?: DndCancelReason;
}

export interface DndAnnouncements {
    instructions: string;
    roleDescription: string;
    onDragStart: (item: DndActiveItem<unknown>) => string;
    onDragOver: (item: DndActiveItem<unknown>, over: DndOverTarget<unknown> | null) => string;
    onDrop: (item: DndActiveItem<unknown>, over: DndOverTarget<unknown> | null) => string;
    onDragCancel: (item: DndActiveItem<unknown>) => string;
}

export interface DraggableOptions<TData = unknown> {
    id: DndId;
    data?: TData;
    type?: string;
    /** @default "both" */
    axis?: DndAxis;
    /**
     * When omitted, auto-detects: if any enabled descendant has `[data-dnd-handle]`,
     * only handles initiate drag; otherwise the whole element initiates drag.
     */
    requiresHandle?: boolean;
    activation?: Partial<DragActivationOptions>;
    /** Accessible item name for `aria-live` announcements. */
    label?: string;
    /** @default false */
    disabled?: boolean;
    /** @default true */
    enabled?: boolean | (() => boolean);
}

export interface SortableOptions<TData = unknown> extends DraggableOptions<TData> {
    containerId: DndId;
    index: number;
    /** Tree parent reference enabling ancestor-cycle prevention. */
    parentId?: DndId | null;
    /** Optional tree depth metadata. */
    depth?: number;
    /**
     * Whether `"inside"` nesting drop zone is valid on this tree node.
     * @default false
     */
    canNest?: boolean;
    /**
     * Whether this tree node is currently expanded.
     * Collapsed nodes trigger `onExpandNode` after `expandDelay`.
     * @default false
     */
    expanded?: boolean;
}

export interface DroppableOptions<TData = unknown, TDropData = unknown> {
    id: DndId;
    /** @default "free" */
    layout?: DndLayout;
    /** @default "vertical" */
    orientation?: DndOrientation;
    data?: TDropData;
    /** Validates whether the active item can be dropped here. */
    accepts?: readonly string[] | ((item: DndActiveItem<TData>, target: DndOverTarget<TDropData>) => boolean);
    /**
     * Per-container override for sibling WAAPI FLIP animations.
     * @default true
     */
    animate?: boolean;
    /**
     * Emits `data-drop-position` on target items.
     * @default false for "list"/"grid", true for "tree"
     */
    indicator?: boolean;
    /**
     * Top/bottom fraction mapped to `"before"`/`"after"` in `"tree"` layout.
     * @default 0.25
     */
    edgeZoneRatio?: number;
    /**
     * Hover duration in ms on a collapsed tree node before calling `onExpandNode`.
     * @default 500
     */
    expandDelay?: number;
    onExpandNode?: (nodeId: DndId) => void;
    /** @default false */
    disabled?: boolean;
    /** @default true */
    enabled?: boolean | (() => boolean);
}

export interface DragHandleOptions {
    /** @default true */
    enabled?: boolean | (() => boolean);
}

export interface DragThumbnailOptions {
    /** @default true */
    enabled?: boolean | (() => boolean);
    /**
     * Preserves pointer grab offset (`"grab"`) or centers on pointer (`"cursor"`).
     * @default "grab"
     */
    align?: "grab" | "cursor";
    /** Optional pixel offset from pointer. */
    offset?: { x?: number; y?: number };
    /**
     * Enables WAAPI settle/cancel flight on release.
     * @default true
     */
    animateSettle?: boolean;
}

export interface DndOptions<TData = unknown, TDropData = unknown> {
    activation?: DragActivationOptions;
    /** @default true */
    autoScroll?: boolean | DndAutoScrollOptions;
    /** @default true */
    animate?: boolean;
    /** @default 6 */
    hysteresisPx?: number;
    announcements?: Partial<DndAnnouncements>;
    onDragStart?: (event: DndDragStartEvent<TData>) => void;
    onDragMove?: (event: DndDragMoveEvent<TData>) => void;
    onDragOver?: (event: DndDragOverEvent<TData, TDropData>) => void;
    onReorder?: (event: DndReorderEvent<TData>) => void;
    onDrop?: (event: DndDropEvent<TData, TDropData>) => void;
    onDragCancel?: (event: DndDragCancelEvent<TData>) => void;
    onDragEnd?: (event: DndDragEndEvent<TData, TDropData>) => void;
}

export interface DndController<TData = unknown, TDropData = unknown> {
    readonly status: DndStatus;
    readonly isDragging: boolean;
    readonly isSettling: boolean;
    readonly active: DndActiveItem<TData> | null;
    readonly over: DndOverTarget<TDropData> | null;
    readonly pointer: DndPoint | null;
    readonly delta: DndPoint;
    readonly inputMethod: DndInputMethod | null;
    isOver(droppableId: DndId): boolean;
    isDraggingItem(id: DndId): boolean;
    cancel(): void;
    destroy(): void;
    draggable(options: DraggableOptions<TData>): Attachment<HTMLElement>;
    sortable(options: SortableOptions<TData>): Attachment<HTMLElement>;
    droppable(options: DroppableOptions<TData, TDropData>): Attachment<HTMLElement>;
    dragHandle(options?: DragHandleOptions): Attachment<HTMLElement>;
    dragThumbnail(options?: DragThumbnailOptions): Attachment<HTMLElement>;
}
