import { createContext, tick, untrack } from "svelte";
import type { Attachment } from "svelte/attachments";
import { SvelteMap } from "svelte/reactivity";

import { resolveGetter } from "../../shared/resolve-getter.ts";
import { DndAnnouncer } from "./announcer.internal.ts";
import { AutoScrollEngine } from "./auto-scroll.internal.ts";
import {
    createCollisionState,
    isAncestorOrSelf,
    resolveCollision,
    updatePointerDirection,
    type CollisionState,
    type RegisteredDroppable,
    type RegisteredItem,
} from "./collision.internal.ts";
import { dragHandle as standaloneDragHandle } from "./dnd.attach.ts";
import type {
    DndActiveItem,
    DndAutoScrollOptions,
    DndCancelReason,
    DndController as DndControllerInterface,
    DndDropPosition,
    DndId,
    DndInputMethod,
    DndOptions,
    DndOverTarget,
    DndPoint,
    DndStatus,
    DragActivationOptions,
    DraggableOptions,
    DragHandleOptions,
    DragThumbnailOptions,
    DroppableOptions,
    SortableOptions,
} from "./dnd.types.ts";
import { ThumbnailManager } from "./thumbnail.internal.ts";
import { getRestingRect, WaapiFlipEngine } from "./waapi-flip.internal.ts";

const DEFAULT_DISTANCE_PX = 6;
const DEFAULT_DELAY_MS = 0;
const DEFAULT_TOLERANCE_PX = 6;
const DEFAULT_HYSTERESIS_PX = 6;
const DEFAULT_TREE_EDGE_RATIO = 0.25;
const DEFAULT_TREE_EXPAND_DELAY_MS = 500;

const INTERACTIVE_SELECTOR =
    'a[href], button, input, textarea, select, option, label, summary, [contenteditable]:not([contenteditable="false"]), [data-dnd-no-drag]';

const NATIVELY_FOCUSABLE_SELECTOR =
    'a[href], button, input, textarea, select, summary, [contenteditable]:not([contenteditable="false"])';

interface PendingDragState<TData> {
    item: RegisteredItem<TData>;
    startPointer: DndPoint;
    pointerId: number;
    distance: number;
    delay: number;
    tolerance: number;
    delayTimer: ReturnType<typeof setTimeout> | null;
}

interface CustomThumbnailRegistration {
    element: HTMLElement;
    options: DragThumbnailOptions;
}

interface PendingCrossContainerMove<TData, TDropData> {
    fromContainerId: DndId;
    toContainerId: DndId;
    fromIndex: number;
    toIndex: number;
    droppable: RegisteredDroppable<TData, TDropData>;
}

const CROSS_CONTAINER_INSTANT_SPEED_PX_S = 100;
const CROSS_CONTAINER_CONFIRM_SPEED_PX_S = 240;
const CROSS_CONTAINER_SWEEP_SPEED_PX_S = 320;
const CROSS_CONTAINER_AXIS_SWEEP_SPEED_PX_S = 140;
const CROSS_CONTAINER_AXIS_RATIO = 1.15;
const CROSS_CONTAINER_CONFIRM_MS = 45;
const CROSS_CONTAINER_DWELL_MS = 120;

function isSameOverTarget<TDropData>(
    a: DndOverTarget<TDropData> | null,
    b: DndOverTarget<TDropData> | null,
): boolean {
    if (a === b) return true;
    if (!a || !b) return false;
    return (
        a.droppableId === b.droppableId &&
        a.itemId === b.itemId &&
        a.containerId === b.containerId &&
        a.index === b.index &&
        a.position === b.position &&
        a.isValid === b.isValid
    );
}

function hasInteractiveAncestorWithin(target: EventTarget | null, boundary: HTMLElement): boolean {
    if (!(target instanceof Element)) return false;

    let current: Element | null = target;
    while (current && current !== boundary) {
        if (current.matches(INTERACTIVE_SELECTOR)) {
            return true;
        }
        current = current.parentElement;
    }

    return boundary.dataset.dndNoDrag !== undefined;
}

function findEnabledHandleWithin(target: EventTarget | null, boundary: HTMLElement): HTMLElement | null {
    if (!(target instanceof Element)) return null;

    let current: Element | null = target;
    while (current) {
        if (current instanceof HTMLElement && current.dataset.dndHandle !== undefined) {
            return current.dataset.disabled !== undefined ? null : current;
        }
        if (current === boundary) break;
        current = current.parentElement;
    }
    return null;
}

function hasAnyEnabledHandle(boundary: HTMLElement): boolean {
    return boundary.querySelector("[data-dnd-handle]:not([data-disabled])") !== null;
}

function resolveItemLabel(element: HTMLElement, explicitLabel: string | undefined, id: DndId): string {
    if (explicitLabel) return explicitLabel;
    const ariaLabel = element.getAttribute("aria-label")?.trim();
    if (ariaLabel) return ariaLabel;
    const text = element.textContent?.trim();
    if (text) return text.slice(0, 80);
    return String(id);
}

function suppressPostDragClick(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
}

function installPostDragClickSuppressor(): void {
    if (typeof window === "undefined") return;

    window.addEventListener("click", suppressPostDragClick, { capture: true, once: true });
    setTimeout(() => {
        window.removeEventListener("click", suppressPostDragClick, { capture: true });
    }, 0);
}

export class DndController<TData = unknown, TDropData = unknown> implements DndControllerInterface<TData, TDropData> {
    #status = $state<DndStatus>("idle");
    #active = $state<DndActiveItem<TData> | null>(null);
    #over = $state<DndOverTarget<TDropData> | null>(null);
    #pointer = $state<DndPoint | null>(null);
    #delta = $state<DndPoint>({ x: 0, y: 0 });
    #inputMethod = $state<DndInputMethod | null>(null);

    #options: DndOptions<TData, TDropData>;
    #items = new SvelteMap<DndId, RegisteredItem<TData>>();
    #droppables = new SvelteMap<DndId, RegisteredDroppable<TData, TDropData>>();
    #customThumbnail: CustomThumbnailRegistration | null = null;

    #waapiFlip = new WaapiFlipEngine();
    #autoScroll = new AutoScrollEngine();
    #thumbnail = new ThumbnailManager();
    #announcer: DndAnnouncer;

    #collisionState: CollisionState = createCollisionState();
    #pending: PendingDragState<TData> | null = null;
    #startPointer: DndPoint | null = null;
    #originRect: DOMRect | null = null;
    #activeElement: HTMLElement | null = null;
    #keyboardFocusEl: HTMLElement | null = null;
    #expandTimer: ReturnType<typeof setTimeout> | null = null;
    #expandNodeId: DndId | null = null;
    #crossContainerTimer: ReturnType<typeof setTimeout> | null = null;
    #crossContainerTargetId: DndId | null = null;
    #pendingCrossContainer: PendingCrossContainerMove<TData, TDropData> | null = null;
    #windowListenersBound = false;
    #scrollListenerBound = false;
    #destroyed = false;

    constructor(options: DndOptions<TData, TDropData> = {}) {
        this.#options = options;
        this.#announcer = new DndAnnouncer(options.announcements);
    }

    get status(): DndStatus {
        return this.#status;
    }

    get isDragging(): boolean {
        return this.#status === "dragging";
    }

    get isSettling(): boolean {
        return this.#status === "settling";
    }

    get active(): DndActiveItem<TData> | null {
        return this.#active;
    }

    get over(): DndOverTarget<TDropData> | null {
        return this.#over;
    }

    get pointer(): DndPoint | null {
        return this.#pointer;
    }

    get delta(): DndPoint {
        return this.#delta;
    }

    get inputMethod(): DndInputMethod | null {
        return this.#inputMethod;
    }

    isOver(droppableId: DndId): boolean {
        return this.#over?.droppableId === droppableId;
    }

    isDraggingItem(id: DndId): boolean {
        return (this.#status === "dragging" || this.#status === "settling") && this.#active?.id === id;
    }

    cancel(): void {
        if (this.#status === "pending") {
            this.#abortPending();
            return;
        }
        if (this.#status === "dragging") {
            void this.#cancelActiveDrag("programmatic");
        }
    }

    destroy(): void {
        if (this.#destroyed) return;
        this.#destroyed = true;

        this.#clearExpandTimer();
        this.#clearCrossContainerGate();
        this.#abortPending();
        this.#unbindWindowListeners();
        this.#unbindScrollListener();
        this.#autoScroll.stop();
        this.#clearGlobalDragFlag();
        this.#clearOverDomAttributes();

        if (this.#activeElement) {
            delete this.#activeElement.dataset.dragging;
            delete this.#activeElement.dataset.pending;
        }

        this.#waapiFlip.cancelElements(this.#items.values().map((item) => item.element));
        this.#thumbnail.destroy();
        this.#announcer.destroy();
        this.#items.clear();
        this.#droppables.clear();
        this.#customThumbnail = null;

        this.#status = "idle";
        this.#active = null;
        this.#over = null;
        this.#pointer = null;
        this.#delta = { x: 0, y: 0 };
        this.#inputMethod = null;
    }

    draggable(options: DraggableOptions<TData>): Attachment<HTMLElement> {
        return this.#createItemAttachment({
            ...options,
            containerId: null,
            index: null,
            parentId: null,
            depth: undefined,
            canNest: false,
            expanded: false,
        });
    }

    sortable(options: SortableOptions<TData>): Attachment<HTMLElement> {
        return this.#createItemAttachment({
            ...options,
            containerId: options.containerId,
            index: options.index,
            parentId: options.parentId ?? null,
            depth: options.depth,
            canNest: options.canNest ?? false,
            expanded: options.expanded ?? false,
        });
    }

    droppable(options: DroppableOptions<TData, TDropData>): Attachment<HTMLElement> {
        return (node: HTMLElement): (() => void) => {
            const isEnabled = resolveGetter(options.enabled) ?? true;
            const disabled = Boolean(options.disabled) || !isEnabled;
            const layout = options.layout ?? "free";
            const orientation = options.orientation ?? "vertical";
            const indicator = options.indicator ?? layout === "tree";

            const entry: RegisteredDroppable<TData, TDropData> = {
                id: options.id,
                element: node,
                layout,
                orientation,
                data: options.data,
                accepts: options.accepts,
                animate: options.animate ?? true,
                indicator,
                edgeZoneRatio: options.edgeZoneRatio ?? DEFAULT_TREE_EDGE_RATIO,
                expandDelay: options.expandDelay ?? DEFAULT_TREE_EXPAND_DELAY_MS,
                onExpandNode: options.onExpandNode,
                disabled,
            };

            this.#droppables.set(options.id, entry);
            node.dataset.dndDroppable = "";
            node.dataset.layout = layout;
            if (layout === "list") {
                node.dataset.orientation = orientation;
            } else {
                delete node.dataset.orientation;
            }
            if (disabled) {
                node.dataset.disabled = "";
            } else {
                delete node.dataset.disabled;
            }

            // Re-apply active hover attributes if Svelte re-ran this attachment mid-drag (untracked to avoid subscribing to `#over`).
            untrack(() => {
                if (this.#over?.droppableId !== options.id) return;
                node.dataset.over = "";
                if (this.#over.isValid) {
                    node.dataset.dropValid = "";
                    delete node.dataset.dropInvalid;
                } else {
                    node.dataset.dropInvalid = "";
                    delete node.dataset.dropValid;
                }
            });

            return (): void => {
                if (this.#droppables.get(options.id) === entry) {
                    this.#droppables.delete(options.id);
                }
                delete node.dataset.dndDroppable;
                delete node.dataset.layout;
                delete node.dataset.orientation;
                delete node.dataset.disabled;
                delete node.dataset.over;
                delete node.dataset.dropValid;
                delete node.dataset.dropInvalid;
            };
        };
    }

    dragHandle(options?: DragHandleOptions): Attachment<HTMLElement> {
        return standaloneDragHandle(options);
    }

    dragThumbnail(options?: DragThumbnailOptions): Attachment<HTMLElement> {
        return (node: HTMLElement): (() => void) => {
            const isEnabled = resolveGetter(options?.enabled) ?? true;
            if (!isEnabled) {
                return (): void => {};
            }

            const registration: CustomThumbnailRegistration = {
                element: node,
                options: options ?? {},
            };
            this.#customThumbnail = registration;

            // If `{#if dnd.active}` mounted this thumbnail right as drag started, promote it now
            // (untracked so reading `#pointer` never re-runs this attachment on every pointermove pixel).
            untrack(() => {
                if (
                    this.#status !== "dragging" ||
                    this.#inputMethod !== "pointer" ||
                    !this.#originRect ||
                    !this.#pointer
                ) {
                    return;
                }
                const grabPointer = this.#startPointer ?? this.#pointer;
                const registered = this.#active ? this.#items.get(this.#active.id) : undefined;
                const thumbEl = this.#thumbnail.mountCustom(
                    node,
                    registration.options,
                    this.#originRect,
                    this.#pointer,
                    grabPointer,
                );
                this.#thumbnail.updatePosition(this.#pointer, registered?.axis ?? "both");
                this.#waapiFlip.animatePickup(thumbEl, {
                    animate: this.#options.animate !== false,
                    scale: this.#thumbnail.scale,
                    rotate: this.#thumbnail.rotate,
                });
            });

            return (): void => {
                if (this.#customThumbnail !== registration) return;
                if (this.#thumbnail.element === node) {
                    this.#thumbnail.unmount();
                }
                this.#customThumbnail = null;
            };
        };
    }

    #createItemAttachment(
        config: DraggableOptions<TData> & {
            containerId: DndId | null;
            index: number | null;
            parentId: DndId | null;
            depth: number | undefined;
            canNest: boolean;
            expanded: boolean;
        },
    ): Attachment<HTMLElement> {
        return (node: HTMLElement): (() => void) => {
            const isEnabled = resolveGetter(config.enabled) ?? true;
            const disabled = Boolean(config.disabled) || !isEnabled;

            const entry: RegisteredItem<TData> = {
                id: config.id,
                element: node,
                type: config.type,
                data: config.data as TData,
                containerId: config.containerId,
                index: config.index,
                parentId: config.parentId,
                depth: config.depth,
                canNest: config.canNest,
                expanded: config.expanded,
                axis: config.axis ?? "both",
                requiresHandle: config.requiresHandle,
                activation: config.activation,
                label: resolveItemLabel(node, config.label, config.id),
                disabled,
            };

            this.#items.set(config.id, entry);
            node.dataset.dndItem = "";

            if (disabled) {
                node.dataset.disabled = "";
            } else {
                delete node.dataset.disabled;
            }

            // Preserve `data-dragging` and activeElement reference when Svelte re-runs attachments after live reorder
            // (untracked so items never re-attach on drag state changes).
            untrack(() => {
                if ((this.#status !== "dragging" && this.#status !== "settling") || this.#active?.id !== config.id) {
                    return;
                }
                this.#activeElement = node;
                node.dataset.dragging = "";
            });

            // Whole-element draggables with delay === 0 need touch-action: none so touch drag is not hijacked by scroll.
            const effectiveDelay = config.activation?.delay ?? this.#options.activation?.delay ?? DEFAULT_DELAY_MS;
            const shouldSetTouchAction = !disabled && effectiveDelay === 0 && !config.requiresHandle && !node.style.touchAction;
            if (shouldSetTouchAction) {
                node.style.touchAction = "none";
            }

            // Keyboard focus & ARIA setup (deferred to handle if present, else on the item itself).
            const addedTabIndex =
                !disabled &&
                !config.requiresHandle &&
                !hasAnyEnabledHandle(node) &&
                !node.hasAttribute("tabindex") &&
                !node.matches(NATIVELY_FOCUSABLE_SELECTOR);
            if (addedTabIndex) {
                node.setAttribute("tabindex", "0");
            }

            const prevRoleDesc = node.getAttribute("aria-roledescription");
            const prevDescribedBy = node.getAttribute("aria-describedby");
            if (!disabled) {
                if (!prevRoleDesc) {
                    node.setAttribute("aria-roledescription", this.#announcer.messages.roleDescription);
                }
                if (!prevDescribedBy) {
                    node.setAttribute("aria-describedby", this.#announcer.ensureInstructionsId());
                }
            }

            const onPointerDown = (event: PointerEvent): void => {
                this.#handleItemPointerDown(event, entry);
            };
            const onKeyDown = (event: KeyboardEvent): void => {
                this.#handleItemKeyDown(event, entry);
            };

            node.addEventListener("pointerdown", onPointerDown);
            node.addEventListener("keydown", onKeyDown);

            return (): void => {
                node.removeEventListener("pointerdown", onPointerDown);
                node.removeEventListener("keydown", onKeyDown);

                if (this.#items.get(config.id) === entry) {
                    this.#items.delete(config.id);
                }
                if (shouldSetTouchAction && node.style.touchAction === "none") {
                    node.style.touchAction = "";
                }
                if (addedTabIndex) {
                    node.removeAttribute("tabindex");
                }
                if (!prevRoleDesc) {
                    node.removeAttribute("aria-roledescription");
                }
                if (!prevDescribedBy) {
                    node.removeAttribute("aria-describedby");
                }
                delete node.dataset.dndItem;
                delete node.dataset.disabled;
                delete node.dataset.pending;
                if (this.#active?.id !== config.id) {
                    delete node.dataset.dragging;
                }
                delete node.dataset.dropPosition;
                node.style.removeProperty("--cs-dnd-target-depth");
            };
        };
    }

    #resolveActivation(item: RegisteredItem<TData>): Required<DragActivationOptions> {
        return {
            distance: item.activation?.distance ?? this.#options.activation?.distance ?? DEFAULT_DISTANCE_PX,
            delay: item.activation?.delay ?? this.#options.activation?.delay ?? DEFAULT_DELAY_MS,
            tolerance: item.activation?.tolerance ?? this.#options.activation?.tolerance ?? DEFAULT_TOLERANCE_PX,
            ignoreInteractive:
                item.activation?.ignoreInteractive ?? this.#options.activation?.ignoreInteractive ?? true,
        };
    }

    #handleItemPointerDown(event: PointerEvent, item: RegisteredItem<TData>): void {
        if (this.#destroyed || item.disabled || this.#status !== "idle") return;
        if (event.button !== 0) return;

        const handleEl = findEnabledHandleWithin(event.target, item.element);
        const requiresHandle = item.requiresHandle ?? hasAnyEnabledHandle(item.element);
        if (requiresHandle && !handleEl) return;

        const activation = this.#resolveActivation(item);
        if (!handleEl && activation.ignoreInteractive && hasInteractiveAncestorWithin(event.target, item.element)) {
            return;
        }

        // Prevent native text selection on desktop mouse drags when dragging from a handle or immediate item.
        if (event.pointerType === "mouse" && activation.delay === 0) {
            event.preventDefault();
        }

        const startPointer: DndPoint = { x: event.clientX, y: event.clientY };
        const pending: PendingDragState<TData> = {
            item,
            startPointer,
            pointerId: event.pointerId,
            distance: activation.distance,
            delay: activation.delay,
            tolerance: activation.tolerance,
            delayTimer: null,
        };

        this.#pending = pending;
        this.#status = "pending";
        this.#pointer = startPointer;
        this.#delta = { x: 0, y: 0 };

        if (activation.delay > 0) {
            item.element.dataset.pending = "";
            pending.delayTimer = setTimeout(() => {
                if (this.#pending === pending && this.#status === "pending") {
                    this.#beginPointerDrag(pending, this.#pointer ?? pending.startPointer);
                }
            }, activation.delay);
        }

        this.#bindWindowListeners();
    }

    #beginPointerDrag(pending: PendingDragState<TData>, currentPointer: DndPoint): void {
        if (pending.delayTimer !== null) {
            clearTimeout(pending.delayTimer);
            pending.delayTimer = null;
        }
        delete pending.item.element.dataset.pending;
        this.#pending = null;

        const item = pending.item;
        const sourceRect = item.element.getBoundingClientRect();
        this.#originRect = sourceRect;
        this.#startPointer = { x: pending.startPointer.x, y: pending.startPointer.y };
        this.#activeElement = item.element;
        this.#collisionState = createCollisionState();
        this.#collisionState.lastPointer = { x: currentPointer.x, y: currentPointer.y };

        const activeItem: DndActiveItem<TData> = {
            id: item.id,
            type: item.type,
            data: item.data,
            containerId: item.containerId,
            index: item.index,
            originContainerId: item.containerId,
            originIndex: item.index,
            label: item.label,
        };

        this.#active = activeItem;
        this.#status = "dragging";
        this.#inputMethod = "pointer";
        this.#pointer = currentPointer;
        this.#delta = this.#computeDelta(currentPointer, item.axis);

        document.documentElement.dataset.dndActive = "";
        item.element.dataset.dragging = "";

        const thumbEl = this.#customThumbnail
            ? this.#thumbnail.mountCustom(
                  this.#customThumbnail.element,
                  this.#customThumbnail.options,
                  sourceRect,
                  currentPointer,
                  pending.startPointer,
              )
            : this.#thumbnail.mountAutoClone(item.element, pending.startPointer);

        this.#thumbnail.updatePosition(currentPointer, item.axis);
        this.#waapiFlip.animatePickup(thumbEl, {
            animate: this.#options.animate !== false,
            scale: this.#thumbnail.scale,
            rotate: this.#thumbnail.rotate,
        });

        const autoScrollOpt = this.#options.autoScroll;
        if (autoScrollOpt !== false) {
            const autoScrollConfig: DndAutoScrollOptions =
                typeof autoScrollOpt === "object" && autoScrollOpt !== null ? autoScrollOpt : {};
            this.#autoScroll.start(currentPointer, item.element, autoScrollConfig, () => {
                if (this.#status === "dragging" && this.#pointer) {
                    this.#evaluatePointerCollision(this.#pointer);
                }
            });
        }

        this.#bindScrollListener();
        this.#options.onDragStart?.({
            item: activeItem,
            inputMethod: "pointer",
            pointer: currentPointer,
        });
        this.#announcer.announce(this.#announcer.messages.onDragStart(activeItem));

        this.#evaluatePointerCollision(currentPointer);
    }

    #computeDelta(pointer: DndPoint, axis: RegisteredItem<TData>["axis"]): DndPoint {
        const start = this.#startPointer;
        if (!start) return { x: 0, y: 0 };
        return {
            x: axis === "y" ? 0 : pointer.x - start.x,
            y: axis === "x" ? 0 : pointer.y - start.y,
        };
    }

    #projectPointerForCollision(pointer: DndPoint): DndPoint {
        const start = this.#startPointer;
        const active = this.#active;
        if (!start || !active) return pointer;
        const axis = this.#items.get(active.id)?.axis ?? "both";
        if (axis === "x") {
            return { x: pointer.x, y: start.y };
        }
        if (axis === "y") {
            return { x: start.x, y: pointer.y };
        }
        return pointer;
    }

    #handleWindowPointerMove = (event: PointerEvent): void => {
        const nextPointer: DndPoint = { x: event.clientX, y: event.clientY };

        if (this.#status === "pending" && this.#pending) {
            if (event.pointerId !== this.#pending.pointerId) return;
            this.#pointer = nextPointer;
            const travel = Math.hypot(
                nextPointer.x - this.#pending.startPointer.x,
                nextPointer.y - this.#pending.startPointer.y,
            );

            if (this.#pending.delay > 0) {
                if (travel > this.#pending.tolerance) {
                    this.#abortPending();
                }
                return;
            }

            if (travel >= this.#pending.distance) {
                this.#beginPointerDrag(this.#pending, nextPointer);
            }
            return;
        }

        if (this.#status !== "dragging" || !this.#active) return;

        const registered = this.#items.get(this.#active.id);
        const axis = registered?.axis ?? "both";

        this.#pointer = nextPointer;
        this.#delta = this.#computeDelta(nextPointer, axis);
        this.#thumbnail.updatePosition(nextPointer, axis);

        const hoveredDroppableEl = this.#over ? (this.#droppables.get(this.#over.droppableId)?.element ?? null) : null;
        this.#autoScroll.updatePointer(nextPointer, hoveredDroppableEl);

        this.#evaluatePointerCollision(nextPointer);

        this.#options.onDragMove?.({
            item: this.#active,
            pointer: nextPointer,
            delta: this.#delta,
        });
    };

    #handleWindowPointerUp = (): void => {
        if (this.#status === "pending") {
            this.#abortPending();
            return;
        }
        if (this.#status === "dragging") {
            void this.#commitDrop();
        }
    };

    #handleWindowPointerCancel = (): void => {
        if (this.#status === "pending") {
            this.#abortPending();
            return;
        }
        if (this.#status === "dragging") {
            void this.#cancelActiveDrag("pointer-cancel");
        }
    };

    #handleWindowKeyDown = (event: KeyboardEvent): void => {
        if (event.key !== "Escape") return;
        if (this.#status === "pending") {
            event.preventDefault();
            this.#abortPending();
            return;
        }
        if (this.#status === "dragging") {
            event.preventDefault();
            void this.#cancelActiveDrag("escape");
        }
    };

    #handleWindowBlur = (): void => {
        if (this.#status === "pending") {
            this.#abortPending();
            return;
        }
        if (this.#status === "dragging") {
            void this.#cancelActiveDrag("pointer-cancel");
        }
    };

    #handleVisibilityChange = (): void => {
        if (document.visibilityState === "hidden") {
            this.#handleWindowBlur();
        }
    };

    #handleWindowScroll = (): void => {
        if (this.#status === "dragging" && this.#inputMethod === "pointer" && this.#pointer) {
            this.#evaluatePointerCollision(this.#pointer);
        }
    };

    #evaluatePointerCollision(pointer: DndPoint): void {
        const active = this.#active;
        if (!active) return;

        // Track velocity from real pointer coordinates, but hit-test with axis-projected coordinates.
        updatePointerDirection(this.#collisionState, pointer);
        const projectedPointer = this.#projectPointerForCollision(pointer);

        const result = resolveCollision({
            pointer: projectedPointer,
            active,
            activeElement: this.#activeElement,
            droppables: this.#droppables.values(),
            itemsById: this.#items,
            state: this.#collisionState,
            hysteresisPx: this.#options.hysteresisPx ?? DEFAULT_HYSTERESIS_PX,
        });

        const droppable = result.droppable
            ? (this.#droppables.get(result.droppable.id) ?? null)
            : null;

        // Live structural mutation for list & grid layouts wrapped in WAAPI FLIP.
        if (
            droppable &&
            (droppable.layout === "list" || droppable.layout === "grid") &&
            result.reorderToIndex !== null &&
            active.containerId !== null &&
            active.index !== null
        ) {
            if (droppable.id === active.containerId) {
                this.#clearCrossContainerGate();
                if (result.reorderToIndex !== active.index) {
                    this.#collisionState.swapGuard = result.nextSwapGuard;
                    this.#performLiveReorder(
                        active.containerId,
                        droppable.id,
                        active.index,
                        result.reorderToIndex,
                        droppable,
                    );
                }
            } else {
                this.#handleCrossContainerCandidate({
                    fromContainerId: active.containerId,
                    toContainerId: droppable.id,
                    fromIndex: active.index,
                    toIndex: result.reorderToIndex,
                    droppable,
                });
            }
        } else if (!droppable || droppable.id !== this.#pendingCrossContainer?.toContainerId) {
            this.#clearCrossContainerGate();
        }

        // Hover-to-expand timer for collapsed tree nodes.
        this.#updateTreeExpandTimer(droppable, result.over);

        this.#setOverTarget(result.over);
    }

    #handleCrossContainerCandidate(candidate: PendingCrossContainerMove<TData, TDropData>): void {
        this.#pendingCrossContainer = candidate;

        const { vx, vy, speed } = this.#collisionState;
        const isCrossAxisSweep =
            candidate.droppable.orientation === "horizontal"
                ? speed > CROSS_CONTAINER_AXIS_SWEEP_SPEED_PX_S &&
                  Math.abs(vy) > Math.abs(vx) * CROSS_CONTAINER_AXIS_RATIO
                : speed > CROSS_CONTAINER_AXIS_SWEEP_SPEED_PX_S &&
                  Math.abs(vx) > Math.abs(vy) * CROSS_CONTAINER_AXIS_RATIO;

        // Pass-through sweep: suppress live container transfer, keep candidate for fast-flick drop flush.
        if (speed > CROSS_CONTAINER_SWEEP_SPEED_PX_S || isCrossAxisSweep) {
            this.#clearCrossContainerTimerOnly();
            return;
        }

        // Very slow/deliberate entry (or synthetic 0ms events): commit immediately.
        if (speed <= CROSS_CONTAINER_INSTANT_SPEED_PX_S) {
            this.#clearCrossContainerGate();
            this.#performLiveReorder(
                candidate.fromContainerId,
                candidate.toContainerId,
                candidate.fromIndex,
                candidate.toIndex,
                candidate.droppable,
            );
            return;
        }

        if (this.#crossContainerTimer !== null && this.#crossContainerTargetId === candidate.toContainerId) {
            return;
        }

        const delayMs =
            speed <= CROSS_CONTAINER_CONFIRM_SPEED_PX_S ? CROSS_CONTAINER_CONFIRM_MS : CROSS_CONTAINER_DWELL_MS;

        this.#clearCrossContainerTimerOnly();
        this.#crossContainerTargetId = candidate.toContainerId;
        this.#crossContainerTimer = setTimeout(() => {
            this.#crossContainerTimer = null;
            this.#crossContainerTargetId = null;
            const pending = this.#pendingCrossContainer;
            if (
                this.#destroyed ||
                this.#status !== "dragging" ||
                !this.#active ||
                !pending ||
                this.#active.containerId === pending.toContainerId ||
                this.#active.containerId === null ||
                this.#active.index === null
            ) {
                return;
            }
            this.#pendingCrossContainer = null;
            this.#performLiveReorder(
                this.#active.containerId,
                pending.toContainerId,
                this.#active.index,
                pending.toIndex,
                pending.droppable,
            );
        }, delayMs);
    }

    #clearCrossContainerTimerOnly(): void {
        if (this.#crossContainerTimer !== null) {
            clearTimeout(this.#crossContainerTimer);
            this.#crossContainerTimer = null;
        }
        this.#crossContainerTargetId = null;
    }

    #clearCrossContainerGate(): void {
        this.#clearCrossContainerTimerOnly();
        this.#pendingCrossContainer = null;
    }

    #performLiveReorder(
        fromContainerId: DndId,
        toContainerId: DndId,
        fromIndex: number,
        toIndex: number,
        targetDroppable: RegisteredDroppable<TData, TDropData>,
    ): void {
        const active = this.#active;
        if (!active) return;

        const affectedElements = this.#collectContainerElements(fromContainerId, toContainerId);
        const snapshots = this.#waapiFlip.snapshot(affectedElements);
        const shouldAnimate = this.#options.animate !== false && targetDroppable.animate;

        active.containerId = toContainerId;
        active.index = toIndex;

        this.#options.onReorder?.({
            item: active,
            fromContainerId,
            toContainerId,
            fromIndex,
            toIndex,
        });

        const activeId = active.id;
        queueMicrotask(() => {
            if (this.#destroyed) return;
            const nextElements = this.#collectContainerElements(fromContainerId, toContainerId);
            const currentActiveEl = this.#items.get(activeId)?.element ?? this.#activeElement;
            this.#waapiFlip.play(snapshots, nextElements, {
                animate: shouldAnimate,
                exclude: this.#inputMethod === "pointer" ? currentActiveEl : null,
                tokenSource: targetDroppable.element,
            });
        });
    }

    #collectContainerElements(containerA: DndId | null, containerB: DndId | null): HTMLElement[] {
        const els: HTMLElement[] = [];
        for (const item of this.#items.values()) {
            if (
                (containerA !== null && item.containerId === containerA) ||
                (containerB !== null && item.containerId === containerB)
            ) {
                els.push(item.element);
            }
        }
        return els;
    }

    #updateTreeExpandTimer(
        droppable: RegisteredDroppable<TData, TDropData> | null,
        over: DndOverTarget<TDropData> | null,
    ): void {
        if (!droppable || droppable.layout !== "tree" || !droppable.onExpandNode || !over || !over.isValid || over.itemId === null) {
            this.#clearExpandTimer();
            return;
        }

        const targetItem = this.#items.get(over.itemId);
        if (!targetItem || !targetItem.canNest || targetItem.expanded) {
            this.#clearExpandTimer();
            return;
        }

        if (this.#expandNodeId === targetItem.id && this.#expandTimer !== null) {
            return;
        }

        this.#clearExpandTimer();
        this.#expandNodeId = targetItem.id;
        const nodeId = targetItem.id;
        const onExpandNode = droppable.onExpandNode;
        this.#expandTimer = setTimeout(() => {
            this.#expandTimer = null;
            this.#expandNodeId = null;
            if (this.#status === "dragging") {
                onExpandNode(nodeId);
            }
        }, droppable.expandDelay);
    }

    #clearExpandTimer(): void {
        if (this.#expandTimer !== null) {
            clearTimeout(this.#expandTimer);
            this.#expandTimer = null;
        }
        this.#expandNodeId = null;
    }

    #setOverTarget(nextOver: DndOverTarget<TDropData> | null): void {
        if (isSameOverTarget(this.#over, nextOver)) {
            return;
        }

        this.#clearOverDomAttributes();
        this.#over = nextOver;
        this.#applyOverDomAttributes(nextOver);

        if (this.#active) {
            this.#options.onDragOver?.({
                item: this.#active,
                over: nextOver,
            });
            if (this.#inputMethod === "keyboard") {
                this.#announcer.announce(this.#announcer.messages.onDragOver(this.#active, nextOver));
            }
        }
    }

    #clearOverDomAttributes(): void {
        for (const droppable of this.#droppables.values()) {
            delete droppable.element.dataset.over;
            delete droppable.element.dataset.dropValid;
            delete droppable.element.dataset.dropInvalid;
        }
        for (const item of this.#items.values()) {
            delete item.element.dataset.dropPosition;
            item.element.style.removeProperty("--cs-dnd-target-depth");
        }
    }

    #applyOverDomAttributes(over: DndOverTarget<TDropData> | null): void {
        if (!over) return;

        const droppable = this.#droppables.get(over.droppableId);
        if (droppable) {
            droppable.element.dataset.over = "";
            if (over.isValid) {
                droppable.element.dataset.dropValid = "";
                delete droppable.element.dataset.dropInvalid;
            } else {
                droppable.element.dataset.dropInvalid = "";
                delete droppable.element.dataset.dropValid;
            }
        }

        if (over.isValid && over.itemId !== null && over.position !== null) {
            const targetItem = this.#items.get(over.itemId);
            if (targetItem && (droppable?.indicator || droppable?.layout === "tree")) {
                targetItem.element.dataset.dropPosition = over.position;
                if (droppable.layout === "tree" && (over.position === "before" || over.position === "after")) {
                    const targetDepth =
                        over.position === "after" && targetItem.canNest && targetItem.expanded
                            ? (targetItem.depth ?? 0) + 1
                            : (targetItem.depth ?? 0);
                    targetItem.element.style.setProperty("--cs-dnd-target-depth", String(targetDepth));
                }
            }
        }
    }

    async #commitDrop(): Promise<void> {
        const active = this.#active;
        if (!active) return;

        const over = this.#over;
        const isFreeItem = active.originContainerId === null;

        // Invalid target or free item dropped outside any droppable cancels cleanly.
        if ((over && !over.isValid) || (!over && isFreeItem)) {
            await this.#cancelActiveDrag("invalid-drop");
            return;
        }

        const wasPointer = this.#inputMethod === "pointer";
        const pendingCross = this.#pendingCrossContainer;
        this.#clearExpandTimer();
        this.#clearCrossContainerGate();
        this.#autoScroll.stop();
        this.#unbindWindowListeners();
        this.#unbindScrollListener();
        this.#clearGlobalDragFlag();

        // Zero-drop fast-flick flush: commit any suppressed/pending valid cross-container transfer before `onDrop`.
        if (
            pendingCross &&
            over?.isValid &&
            over.droppableId === pendingCross.toContainerId &&
            active.containerId !== null &&
            active.index !== null &&
            active.containerId !== pendingCross.toContainerId
        ) {
            this.#performLiveReorder(
                active.containerId,
                pendingCross.toContainerId,
                active.index,
                pendingCross.toIndex,
                pendingCross.droppable,
            );
        }

        if (wasPointer) {
            installPostDragClickSuppressor();
        }

        this.#status = "settling";
        this.#thumbnail.setStatus("settling");

        const droppable = over ? (this.#droppables.get(over.droppableId) ?? null) : null;
        const targetContainerId = over?.containerId ?? active.containerId;
        const targetIndex = over?.index ?? active.index;
        const targetItemId = over?.itemId ?? null;
        const position = over?.position ?? null;

        let didMove: boolean;
        if (droppable?.layout === "free") {
            didMove = Boolean(over?.isValid);
        } else if (droppable?.layout === "tree") {
            didMove = Boolean(over?.isValid && over.itemId !== active.id);
        } else {
            didMove = targetContainerId !== active.originContainerId || targetIndex !== active.originIndex;
        }

        const droppableId = over?.droppableId ?? active.containerId ?? active.id;

        this.#options.onDrop?.({
            item: active,
            droppableId,
            droppableData: over?.data,
            originContainerId: active.originContainerId,
            originIndex: active.originIndex,
            targetContainerId,
            targetIndex,
            targetItemId,
            position,
            didMove,
        });

        this.#announcer.announce(this.#announcer.messages.onDrop(active, over));

        // Let Svelte flush all DOM updates triggered by `onDrop` before measuring final settle rect.
        await tick();
        if (this.#destroyed) return;

        const thumbEl = this.#thumbnail.element;
        const shouldAnimateSettle =
            wasPointer &&
            thumbEl !== null &&
            this.#options.animate !== false &&
            (this.#customThumbnail?.options.animateSettle ?? true);

        if (wasPointer && thumbEl) {
            const rawCurrentEl = this.#items.get(active.id)?.element ?? this.#activeElement;
            const currentEl = rawCurrentEl && rawCurrentEl.isConnected ? rawCurrentEl : null;

            if (currentEl) {
                const targetRect = getRestingRect(currentEl);
                const fromPos = this.#thumbnail.position;
                const targetPaddingInlineStart =
                    !this.#customThumbnail &&
                    currentEl.tagName !== "TR" &&
                    typeof window.getComputedStyle === "function"
                        ? window.getComputedStyle(currentEl).paddingInlineStart
                        : undefined;
                await this.#waapiFlip.animateFlight(thumbEl, {
                    fromX: fromPos.x,
                    fromY: fromPos.y,
                    toX: targetRect.left,
                    toY: targetRect.top,
                    fromScale: this.#thumbnail.scale,
                    rotate: this.#thumbnail.rotate,
                    kind: "settle",
                    animate: shouldAnimateSettle,
                    ...(targetPaddingInlineStart && { targetPaddingInlineStart }),
                });
            } else {
                // Item was consumed/unmounted on drop (e.g. moved to a free dropzone or trash): dissolve in place.
                await this.#waapiFlip.animateDissolve(thumbEl, {
                    fromScale: this.#thumbnail.scale,
                    rotate: this.#thumbnail.rotate,
                    animate: shouldAnimateSettle,
                });
            }
            if (this.#destroyed) return;
        }

        this.#finalizeDrag(true);
    }

    async #cancelActiveDrag(reason: DndCancelReason): Promise<void> {
        const active = this.#active;
        if (!active) return;

        const wasPointer = this.#inputMethod === "pointer";
        this.#clearExpandTimer();
        this.#clearCrossContainerGate();
        this.#autoScroll.stop();
        this.#unbindWindowListeners();
        this.#unbindScrollListener();
        this.#clearGlobalDragFlag();

        if (wasPointer) {
            installPostDragClickSuppressor();
        }

        this.#status = "settling";
        this.#thumbnail.setStatus("settling");

        const affectedElements = this.#collectContainerElements(active.originContainerId, active.containerId);
        const snapshots = this.#waapiFlip.snapshot(affectedElements);
        const shouldAnimate = this.#options.animate !== false;

        this.#options.onDragCancel?.({
            item: active,
            originContainerId: active.originContainerId,
            originIndex: active.originIndex,
            currentContainerId: active.containerId,
            currentIndex: active.index,
            reason,
        });

        this.#announcer.announce(this.#announcer.messages.onDragCancel(active));

        // Let Svelte flush any state reversion performed inside `onDragCancel`.
        await tick();
        if (this.#destroyed) return;

        const nextElements = this.#collectContainerElements(active.originContainerId, active.containerId);
        const currentEl = this.#items.get(active.id)?.element ?? this.#activeElement;
        this.#waapiFlip.play(snapshots, nextElements, {
            animate: shouldAnimate,
            exclude: wasPointer ? currentEl : null,
        });

        const thumbEl = this.#thumbnail.element;
        const shouldAnimateCancel =
            wasPointer &&
            thumbEl !== null &&
            shouldAnimate &&
            (this.#customThumbnail?.options.animateSettle ?? true);

        if (wasPointer && thumbEl) {
            const rawOriginEl = this.#items.get(active.id)?.element ?? this.#activeElement;
            const originEl = rawOriginEl && rawOriginEl.isConnected ? rawOriginEl : null;
            const targetRect = originEl ? getRestingRect(originEl) : this.#originRect;
            if (targetRect) {
                const fromPos = this.#thumbnail.position;
                await this.#waapiFlip.animateFlight(thumbEl, {
                    fromX: fromPos.x,
                    fromY: fromPos.y,
                    toX: targetRect.left,
                    toY: targetRect.top,
                    fromScale: this.#thumbnail.scale,
                    rotate: this.#thumbnail.rotate,
                    kind: "cancel",
                    animate: shouldAnimateCancel,
                });
                if (this.#destroyed) return;
            }
        }

        this.#finalizeDrag(false, reason);
    }

    #finalizeDrag(dropped: boolean, cancelReason?: DndCancelReason): void {
        const endedItem = this.#active;
        const endedOver = this.#over;
        const focusEl = this.#keyboardFocusEl;
        const wasKeyboard = this.#inputMethod === "keyboard";

        this.#thumbnail.unmount();
        this.#clearOverDomAttributes();

        if (this.#activeElement) {
            delete this.#activeElement.dataset.dragging;
            delete this.#activeElement.dataset.pending;
        }
        if (endedItem) {
            const currentEl = this.#items.get(endedItem.id)?.element;
            if (currentEl) {
                delete currentEl.dataset.dragging;
                delete currentEl.dataset.pending;
            }
        }

        this.#status = "idle";
        this.#active = null;
        this.#over = null;
        this.#pointer = null;
        this.#delta = { x: 0, y: 0 };
        this.#inputMethod = null;
        this.#startPointer = null;
        this.#originRect = null;
        this.#activeElement = null;
        this.#keyboardFocusEl = null;
        this.#collisionState = createCollisionState();

        if (endedItem) {
            this.#options.onDragEnd?.({
                item: endedItem,
                over: endedOver,
                dropped,
                ...(cancelReason && { cancelReason }),
            });
        }

        if (wasKeyboard && focusEl && focusEl.isConnected) {
            focusEl.focus();
        }
    }

    #abortPending(): void {
        if (!this.#pending) return;
        if (this.#pending.delayTimer !== null) {
            clearTimeout(this.#pending.delayTimer);
        }
        delete this.#pending.item.element.dataset.pending;
        this.#pending = null;
        this.#unbindWindowListeners();
        this.#status = "idle";
        this.#pointer = null;
        this.#delta = { x: 0, y: 0 };
    }

    #handleItemKeyDown(event: KeyboardEvent, item: RegisteredItem<TData>): void {
        if (this.#destroyed || item.disabled) return;

        const handleEl = findEnabledHandleWithin(event.target, item.element);
        const requiresHandle = item.requiresHandle ?? hasAnyEnabledHandle(item.element);
        if (requiresHandle && !handleEl) return;

        // When not using a handle, ignore keystrokes originating inside nested interactive controls.
        if (!handleEl && event.target !== item.element && hasInteractiveAncestorWithin(event.target, item.element)) {
            return;
        }

        if (event.key === " " || event.key === "Enter") {
            if (this.#status === "idle") {
                event.preventDefault();
                this.#beginKeyboardDrag(item, handleEl ?? item.element);
                return;
            }
            if (this.#status === "dragging" && this.#inputMethod === "keyboard" && this.#active?.id === item.id) {
                event.preventDefault();
                void this.#commitDrop();
                return;
            }
        }

        if (this.#status !== "dragging" || this.#inputMethod !== "keyboard" || this.#active?.id !== item.id) {
            return;
        }

        if (event.key === "Escape") {
            event.preventDefault();
            void this.#cancelActiveDrag("escape");
            return;
        }

        const arrowKeys = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"] as const;
        if (arrowKeys.includes(event.key as (typeof arrowKeys)[number])) {
            event.preventDefault();
            this.#handleKeyboardArrow(event.key as (typeof arrowKeys)[number]);
        }
    }

    #beginKeyboardDrag(item: RegisteredItem<TData>, focusTarget: HTMLElement): void {
        const activeItem: DndActiveItem<TData> = {
            id: item.id,
            type: item.type,
            data: item.data,
            containerId: item.containerId,
            index: item.index,
            originContainerId: item.containerId,
            originIndex: item.index,
            label: item.label,
        };

        this.#active = activeItem;
        this.#activeElement = item.element;
        this.#keyboardFocusEl = focusTarget;
        this.#status = "dragging";
        this.#inputMethod = "keyboard";
        this.#pointer = null;
        this.#delta = { x: 0, y: 0 };

        item.element.dataset.dragging = "";
        this.#bindWindowListeners();

        this.#options.onDragStart?.({
            item: activeItem,
            inputMethod: "keyboard",
            pointer: null,
        });
        this.#announcer.announce(this.#announcer.messages.onDragStart(activeItem));

        // Initialize keyboard `over` to current container/slot if sortable (after `onDragStart`).
        if (item.containerId !== null) {
            const droppable = this.#droppables.get(item.containerId);
            if (droppable) {
                this.#setOverTarget({
                    droppableId: droppable.id,
                    itemId: droppable.layout === "tree" ? item.id : null,
                    containerId: droppable.id,
                    index: item.index,
                    position: droppable.layout === "tree" ? "before" : null,
                    isValid: true,
                    data: droppable.data,
                });
            }
        }
    }

    #handleKeyboardArrow(key: "ArrowUp" | "ArrowDown" | "ArrowLeft" | "ArrowRight"): void {
        const active = this.#active;
        if (!active) return;

        const currentContainerId = active.containerId;
        const currentDroppable = currentContainerId !== null ? this.#droppables.get(currentContainerId) : null;

        if (!currentDroppable || currentDroppable.layout === "free") {
            this.#keyboardCycleFreeDroppables(key === "ArrowDown" || key === "ArrowRight" ? 1 : -1);
            return;
        }

        if (currentDroppable.layout === "list") {
            this.#keyboardMoveList(currentDroppable, key);
            return;
        }

        if (currentDroppable.layout === "grid") {
            this.#keyboardMoveGrid(currentDroppable, key);
            return;
        }

        if (currentDroppable.layout === "tree") {
            this.#keyboardMoveTree(currentDroppable, key);
        }
    }

    #keyboardCycleFreeDroppables(step: 1 | -1): void {
        const active = this.#active;
        if (!active) return;

        const candidates = this.#droppables
            .values()
            .filter((d) => !d.disabled && d.layout === "free")
            .toArray();
        if (candidates.length === 0) return;

        const currentIdx = this.#over ? candidates.findIndex((d) => d.id === this.#over?.droppableId) : -1;
        const nextIdx =
            currentIdx === -1
                ? step > 0
                    ? 0
                    : candidates.length - 1
                : (currentIdx + step + candidates.length) % candidates.length;

        const next = candidates[nextIdx];
        if (!next) return;

        const target: DndOverTarget<TDropData> = {
            droppableId: next.id,
            itemId: null,
            containerId: null,
            index: null,
            position: null,
            isValid: true,
            data: next.data,
        };
        target.isValid = this.#checkAccepts(next, active, target);
        this.#setOverTarget(target);
    }

    #keyboardMoveList(
        droppable: RegisteredDroppable<TData, TDropData>,
        key: "ArrowUp" | "ArrowDown" | "ArrowLeft" | "ArrowRight",
    ): void {
        const active = this.#active;
        if (!active || active.containerId === null || active.index === null) return;

        const isHorizontal = droppable.orientation === "horizontal";
        const isBackward = key === (isHorizontal ? "ArrowLeft" : "ArrowUp");
        const isForward = key === (isHorizontal ? "ArrowRight" : "ArrowDown");

        if (isBackward || isForward) {
            const items = this.#getSortedContainerItems(droppable.id);
            const nextIndex = Math.max(0, Math.min(items.length - 1, active.index + (isForward ? 1 : -1)));
            if (nextIndex === active.index) return;

            this.#performLiveReorder(droppable.id, droppable.id, active.index, nextIndex, droppable);
            this.#setOverTarget({
                droppableId: droppable.id,
                itemId: null,
                containerId: droppable.id,
                index: nextIndex,
                position: null,
                isValid: true,
                data: droppable.data,
            });
            this.#preserveKeyboardFocus();
            return;
        }

        // Cross-axis arrow transfers to an adjacent compatible list container (Kanban).
        const step = key === "ArrowRight" || key === "ArrowDown" ? 1 : -1;
        const compatible = this.#droppables
            .values()
            .filter((d) => !d.disabled && d.layout === "list")
            .toArray();
        const curIdx = compatible.findIndex((d) => d.id === droppable.id);
        if (curIdx === -1 || compatible.length <= 1) return;

        for (let offset = 1; offset < compatible.length; offset++) {
            const candidate = compatible[(curIdx + step * offset + compatible.length) % compatible.length];
            if (!candidate || candidate.id === droppable.id) continue;

            const destItems = this.#getSortedContainerItems(candidate.id);
            const targetIndex = Math.min(active.index, destItems.length);
            const overCandidate: DndOverTarget<TDropData> = {
                droppableId: candidate.id,
                itemId: null,
                containerId: candidate.id,
                index: targetIndex,
                position: null,
                isValid: true,
                data: candidate.data,
            };
            if (!this.#checkAccepts(candidate, active, overCandidate)) continue;

            this.#performLiveReorder(droppable.id, candidate.id, active.index, targetIndex, candidate);
            this.#setOverTarget(overCandidate);
            this.#preserveKeyboardFocus();
            return;
        }
    }

    #keyboardMoveGrid(
        droppable: RegisteredDroppable<TData, TDropData>,
        key: "ArrowUp" | "ArrowDown" | "ArrowLeft" | "ArrowRight",
    ): void {
        const active = this.#active;
        if (!active || active.containerId === null || active.index === null) return;

        const items = this.#getSortedContainerItems(droppable.id);
        if (items.length <= 1) return;

        let targetIndex = active.index;

        if (key === "ArrowLeft" || key === "ArrowRight") {
            targetIndex = Math.max(0, Math.min(items.length - 1, active.index + (key === "ArrowRight" ? 1 : -1)));
        } else {
            const activeItem = this.#items.get(active.id);
            if (!activeItem) return;
            const activeRect = getRestingRect(activeItem.element);
            const activeCx = activeRect.left + activeRect.width / 2;
            const activeCy = activeRect.top + activeRect.height / 2;

            let bestScore = Infinity;
            for (const candidate of items) {
                if (candidate.id === active.id || candidate.index === null) continue;
                const rect = getRestingRect(candidate.element);
                const cy = rect.top + rect.height / 2;
                const dy = cy - activeCy;
                if (key === "ArrowDown" && dy <= 4) continue;
                if (key === "ArrowUp" && dy >= -4) continue;

                const dx = Math.abs(rect.left + rect.width / 2 - activeCx);
                const score = Math.abs(dy) + dx * 2;
                if (score < bestScore) {
                    bestScore = score;
                    targetIndex = candidate.index;
                }
            }
        }

        if (targetIndex === active.index) return;

        this.#performLiveReorder(droppable.id, droppable.id, active.index, targetIndex, droppable);
        this.#setOverTarget({
            droppableId: droppable.id,
            itemId: null,
            containerId: droppable.id,
            index: targetIndex,
            position: null,
            isValid: true,
            data: droppable.data,
        });
        this.#preserveKeyboardFocus();
    }

    #keyboardMoveTree(
        droppable: RegisteredDroppable<TData, TDropData>,
        key: "ArrowUp" | "ArrowDown" | "ArrowLeft" | "ArrowRight",
    ): void {
        const active = this.#active;
        if (!active) return;

        const visibleItems = this.#getSortedContainerItems(droppable.id).filter(
            (item) => !isAncestorOrSelf(this.#items, item.id, active.id),
        );
        if (visibleItems.length === 0) return;

        if (key === "ArrowRight" && this.#over?.itemId !== null && this.#over?.itemId !== undefined) {
            const currentNode = this.#items.get(this.#over.itemId);
            if (currentNode?.canNest) {
                if (!currentNode.expanded && droppable.onExpandNode) {
                    droppable.onExpandNode(currentNode.id);
                }
                const nextTarget: DndOverTarget<TDropData> = {
                    droppableId: droppable.id,
                    itemId: currentNode.id,
                    containerId: droppable.id,
                    index: currentNode.index,
                    position: "inside",
                    isValid: true,
                    data: droppable.data,
                };
                nextTarget.isValid = this.#checkAccepts(droppable, active, nextTarget);
                this.#setOverTarget(nextTarget);
                return;
            }
        }

        if (key === "ArrowLeft" && this.#over?.itemId !== null && this.#over?.itemId !== undefined && this.#over.position === "inside") {
            const currentNode = this.#items.get(this.#over.itemId);
            if (currentNode) {
                const nextTarget: DndOverTarget<TDropData> = {
                    droppableId: droppable.id,
                    itemId: currentNode.id,
                    containerId: droppable.id,
                    index: currentNode.index,
                    position: "after",
                    isValid: true,
                    data: droppable.data,
                };
                nextTarget.isValid = this.#checkAccepts(droppable, active, nextTarget);
                this.#setOverTarget(nextTarget);
                return;
            }
        }

        // Build ordered slots: [before, (inside if canNest), after] for each valid visible node.
        const slots: Array<{ item: RegisteredItem<TData>; position: DndDropPosition }> = [];
        for (const item of visibleItems) {
            slots.push({ item, position: "before" });
            if (item.canNest) {
                slots.push({ item, position: "inside" });
            }
            slots.push({ item, position: "after" });
        }

        const currentSlotIdx = this.#over
            ? slots.findIndex((s) => s.item.id === this.#over?.itemId && s.position === this.#over?.position)
            : -1;
        const step = key === "ArrowDown" || key === "ArrowRight" ? 1 : -1;
        const nextSlotIdx =
            currentSlotIdx === -1
                ? step > 0
                    ? 0
                    : slots.length - 1
                : Math.max(0, Math.min(slots.length - 1, currentSlotIdx + step));

        const slot = slots[nextSlotIdx];
        if (!slot) return;

        const nextTarget: DndOverTarget<TDropData> = {
            droppableId: droppable.id,
            itemId: slot.item.id,
            containerId: droppable.id,
            index: slot.item.index,
            position: slot.position,
            isValid: true,
            data: droppable.data,
        };
        nextTarget.isValid = this.#checkAccepts(droppable, active, nextTarget);
        this.#setOverTarget(nextTarget);
    }

    #preserveKeyboardFocus(): void {
        const focusEl = this.#keyboardFocusEl;
        queueMicrotask(() => {
            if (focusEl && focusEl.isConnected && document.activeElement !== focusEl) {
                focusEl.focus();
            }
        });
    }

    #getSortedContainerItems(containerId: DndId): RegisteredItem<TData>[] {
        const list: RegisteredItem<TData>[] = [];
        for (const item of this.#items.values()) {
            if (!item.disabled && item.containerId === containerId && item.index !== null) {
                list.push(item);
            }
        }
        list.sort((a, b) => (a.index ?? 0) - (b.index ?? 0));
        return list;
    }

    #checkAccepts(
        droppable: RegisteredDroppable<TData, TDropData>,
        active: DndActiveItem<TData>,
        target: DndOverTarget<TDropData>,
    ): boolean {
        const { accepts } = droppable;
        if (!accepts) return true;
        if (Array.isArray(accepts)) {
            return active.type !== undefined && accepts.includes(active.type);
        }
        if (typeof accepts === "function") {
            return accepts(active, target);
        }
        return true;
    }

    #bindWindowListeners(): void {
        if (this.#windowListenersBound || typeof window === "undefined") return;
        this.#windowListenersBound = true;
        window.addEventListener("pointermove", this.#handleWindowPointerMove);
        window.addEventListener("pointerup", this.#handleWindowPointerUp);
        window.addEventListener("pointercancel", this.#handleWindowPointerCancel);
        window.addEventListener("keydown", this.#handleWindowKeyDown);
        window.addEventListener("blur", this.#handleWindowBlur);
        document.addEventListener("visibilitychange", this.#handleVisibilityChange);
    }

    #unbindWindowListeners(): void {
        if (!this.#windowListenersBound || typeof window === "undefined") return;
        this.#windowListenersBound = false;
        window.removeEventListener("pointermove", this.#handleWindowPointerMove);
        window.removeEventListener("pointerup", this.#handleWindowPointerUp);
        window.removeEventListener("pointercancel", this.#handleWindowPointerCancel);
        window.removeEventListener("keydown", this.#handleWindowKeyDown);
        window.removeEventListener("blur", this.#handleWindowBlur);
        document.removeEventListener("visibilitychange", this.#handleVisibilityChange);
    }

    #bindScrollListener(): void {
        if (this.#scrollListenerBound || typeof window === "undefined") return;
        this.#scrollListenerBound = true;
        window.addEventListener("scroll", this.#handleWindowScroll, { capture: true, passive: true });
    }

    #unbindScrollListener(): void {
        if (!this.#scrollListenerBound || typeof window === "undefined") return;
        this.#scrollListenerBound = false;
        window.removeEventListener("scroll", this.#handleWindowScroll, { capture: true });
    }

    #clearGlobalDragFlag(): void {
        if (typeof document !== "undefined") {
            delete document.documentElement.dataset.dndActive;
        }
    }
}

/**
 * Creates a reactive Svelte 5 Drag & Drop controller (`DndController`).
 */
export function createDnd<TData = unknown, TDropData = unknown>(
    options?: DndOptions<TData, TDropData>,
): DndController<TData, TDropData> {
    return new DndController<TData, TDropData>(options);
}

const [getRawDndContext, setRawDndContext] = createContext<DndController<unknown, unknown>>();

/**
 * Provides a `DndController` instance to descendant components via Svelte 5 context.
 */
export function setDndContext<TData = unknown, TDropData = unknown>(
    dnd: DndController<TData, TDropData>,
): DndController<TData, TDropData> {
    setRawDndContext(dnd as DndController<unknown, unknown>);
    return dnd;
}

/**
 * Retrieves the nearest ancestor `DndController` instance from Svelte 5 context.
 */
export function getDndContext<TData = unknown, TDropData = unknown>(): DndController<TData, TDropData> {
    return getRawDndContext() as DndController<TData, TDropData>;
}
