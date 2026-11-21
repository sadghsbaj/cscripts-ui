import type { DndAxis, DndPoint, DragThumbnailOptions } from "./dnd.types.ts";
import { readCssNumber } from "./waapi-flip.internal.ts";

interface CustomRestorePoint {
    element: HTMLElement;
    parent: Node | null;
    nextSibling: Node | null;
    originalStyle: string;
}

function sanitizeClone(root: HTMLElement): void {
    root.removeAttribute("id");
    delete root.dataset.dragging;
    delete root.dataset.pending;
    delete root.dataset.dropPosition;

    const descendants = root.querySelectorAll("[id], [data-dragging], [data-pending], [data-drop-position]");
    for (const node of descendants) {
        node.removeAttribute("id");
        if (node instanceof HTMLElement) {
            delete node.dataset.dragging;
            delete node.dataset.pending;
            delete node.dataset.dropPosition;
        }
    }
}

/**
 * Builds a pixel-locked auto-clone of `sourceEl`.
 * For `<tr>` elements, wraps the cloned row in a `<table><tbody>` shell with locked
 * `<td>`/`<th>` widths and copied `border-collapse`/`border-spacing` so column alignment
 * and table CSS selectors remain 1:1.
 */
function buildAutoClone(sourceEl: HTMLElement, rect: DOMRect): HTMLElement {
    const lockedWidth = Math.round(rect.width);
    const lockedHeight = Math.round(rect.height);

    if (sourceEl.tagName === "TR") {
        const sourceCells = [...sourceEl.children].filter(
            (child): child is HTMLTableCellElement => child.tagName === "TD" || child.tagName === "TH",
        );
        const cellWidths = sourceCells.map((cell) => Math.round(cell.getBoundingClientRect().width));

        const clonedRow = sourceEl.cloneNode(true) as HTMLTableRowElement;
        sanitizeClone(clonedRow);

        const clonedCells = [...clonedRow.children].filter(
            (child): child is HTMLTableCellElement => child.tagName === "TD" || child.tagName === "TH",
        );
        for (const [i, cell] of clonedCells.entries()) {
            const width = cellWidths[i];
            if (width !== undefined) {
                cell.style.width = `${width}px`;
                cell.style.minWidth = `${width}px`;
                cell.style.maxWidth = `${width}px`;
                cell.style.boxSizing = "border-box";
            }
        }

        const table = document.createElement("table");
        table.className = "cs-dnd-thumbnail cs-dnd-thumbnail-table";
        table.style.width = `${lockedWidth}px`;
        table.style.height = `${lockedHeight}px`;
        table.style.tableLayout = "fixed";
        table.style.margin = "0";

        const sourceTable = sourceEl.closest("table");
        if (sourceTable && typeof window.getComputedStyle === "function") {
            const tableStyle = window.getComputedStyle(sourceTable);
            table.style.borderCollapse = tableStyle.borderCollapse;
            table.style.borderSpacing = tableStyle.borderSpacing;
            table.style.fontFamily = tableStyle.fontFamily;
            table.style.fontSize = tableStyle.fontSize;
            table.style.fontWeight = tableStyle.fontWeight;
            table.style.lineHeight = tableStyle.lineHeight;
            table.style.letterSpacing = tableStyle.letterSpacing;
            table.style.textAlign = tableStyle.textAlign;
            table.style.color = tableStyle.color;
        }

        const tbody = document.createElement("tbody");
        tbody.append(clonedRow);
        table.append(tbody);
        return table;
    }

    const clone = sourceEl.cloneNode(true) as HTMLElement;
    sanitizeClone(clone);
    clone.classList.add("cs-dnd-thumbnail");
    clone.style.width = `${lockedWidth}px`;
    clone.style.height = `${lockedHeight}px`;
    clone.style.margin = "0";
    clone.style.boxSizing = "border-box";
    return clone;
}

/**
 * Manages the lazy Top-Layer (`popover="manual"`) thumbnail host, auto-cloning,
 * custom `dragThumbnail` reparenting, and integer-snapped GPU positioning.
 */
export class ThumbnailManager {
    private host: HTMLDivElement | null = null;
    private thumbnailEl: HTMLElement | null = null;
    private customRestore: CustomRestorePoint | null = null;
    private grabOffsetX = 0;
    private grabOffsetY = 0;
    private initialX = 0;
    private initialY = 0;
    private currentX = 0;
    private currentY = 0;
    private isCustom = false;

    get element(): HTMLElement | null {
        return this.thumbnailEl;
    }

    get position(): DndPoint {
        return { x: this.currentX, y: this.currentY };
    }

    get scale(): number {
        if (!this.thumbnailEl) return 1.02;
        return readCssNumber(this.thumbnailEl, "--cs-dnd-thumbnail-scale", 1.02);
    }

    get rotate(): string {
        if (!this.thumbnailEl || typeof window.getComputedStyle !== "function") return "0deg";
        const raw = window.getComputedStyle(this.thumbnailEl).getPropertyValue("--cs-dnd-thumbnail-rotate").trim();
        return raw || "0deg";
    }

    private ensureHost(): HTMLDivElement {
        if (this.host && this.host.isConnected) {
            return this.host;
        }

        const host = document.createElement("div");
        host.className = "cs-dnd-thumbnail-host";
        host.setAttribute("popover", "manual");
        host.setAttribute("aria-hidden", "true");
        document.body.append(host);
        this.host = host;
        return host;
    }

    private showHost(host: HTMLDivElement): void {
        if (typeof host.showPopover === "function") {
            try {
                if (!host.matches(":popover-open")) {
                    host.showPopover();
                }
            } catch {
                // Fallback fixed positioning with z-index: 2147483647 remains active via CSS.
            }
        }
    }

    private hideHost(): void {
        if (!this.host) return;
        if (typeof this.host.hidePopover === "function") {
            try {
                if (this.host.matches(":popover-open")) {
                    this.host.hidePopover();
                }
            } catch {
                // Ignore environments where popover state cannot be toggled.
            }
        }
    }

    mountAutoClone(sourceEl: HTMLElement, pointer: DndPoint): HTMLElement {
        this.unmount();

        const host = this.ensureHost();
        const rect = sourceEl.getBoundingClientRect();
        const clone = buildAutoClone(sourceEl, rect);
        clone.dataset.status = "dragging";

        this.grabOffsetX = pointer.x - rect.left;
        this.grabOffsetY = pointer.y - rect.top;
        this.initialX = Math.round(rect.left);
        this.initialY = Math.round(rect.top);
        this.currentX = this.initialX;
        this.currentY = this.initialY;
        this.thumbnailEl = clone;
        this.isCustom = false;

        host.append(clone);
        this.showHost(host);
        this.applyTransform(this.currentX, this.currentY);
        return clone;
    }

    mountCustom(
        customEl: HTMLElement,
        options: DragThumbnailOptions,
        sourceRect: DOMRect,
        pointer: DndPoint,
        grabPointer: DndPoint = pointer,
    ): HTMLElement {
        // If an auto-clone was temporarily mounted before Svelte mounted `{#if dnd.active}`, replace it.
        if (this.thumbnailEl && !this.isCustom) {
            this.thumbnailEl.remove();
            this.thumbnailEl = null;
        }

        const host = this.ensureHost();
        this.customRestore = {
            element: customEl,
            parent: customEl.parentNode,
            nextSibling: customEl.nextSibling,
            originalStyle: customEl.getAttribute("style") ?? "",
        };

        customEl.classList.add("cs-dnd-thumbnail");
        customEl.dataset.status = "dragging";
        host.append(customEl);
        this.showHost(host);

        const customRect = customEl.getBoundingClientRect();
        const align = options.align ?? "grab";
        const extraX = options.offset?.x ?? 0;
        const extraY = options.offset?.y ?? 0;

        if (align === "cursor") {
            this.grabOffsetX = customRect.width / 2 - extraX;
            this.grabOffsetY = customRect.height / 2 - extraY;
        } else {
            this.grabOffsetX = grabPointer.x - sourceRect.left - extraX;
            this.grabOffsetY = grabPointer.y - sourceRect.top - extraY;
        }

        this.initialX = Math.round(pointer.x - this.grabOffsetX);
        this.initialY = Math.round(pointer.y - this.grabOffsetY);
        this.currentX = this.initialX;
        this.currentY = this.initialY;
        this.thumbnailEl = customEl;
        this.isCustom = true;

        this.applyTransform(this.currentX, this.currentY);
        return customEl;
    }

    updatePosition(pointer: DndPoint, axis: DndAxis): void {
        if (!this.thumbnailEl) return;

        const nextX = axis === "y" ? this.initialX : Math.round(pointer.x - this.grabOffsetX);
        const nextY = axis === "x" ? this.initialY : Math.round(pointer.y - this.grabOffsetY);

        this.currentX = nextX;
        this.currentY = nextY;
        this.applyTransform(nextX, nextY);
    }

    setStatus(status: "dragging" | "settling"): void {
        if (this.thumbnailEl) {
            this.thumbnailEl.dataset.status = status;
        }
    }

    unmount(): void {
        if (this.customRestore) {
            const { element, parent, nextSibling, originalStyle } = this.customRestore;
            element.classList.remove("cs-dnd-thumbnail");
            delete element.dataset.status;
            element.style.cssText = originalStyle;
            if (parent && parent.isConnected) {
                parent.insertBefore(element, nextSibling && nextSibling.parentNode === parent ? nextSibling : null);
            }
            this.customRestore = null;
        } else if (this.thumbnailEl) {
            this.thumbnailEl.remove();
        }

        this.thumbnailEl = null;
        this.isCustom = false;
        this.hideHost();
    }

    destroy(): void {
        this.unmount();
        if (this.host) {
            this.host.remove();
            this.host = null;
        }
    }

    private applyTransform(x: number, y: number): void {
        if (!this.thumbnailEl) return;
        this.thumbnailEl.style.transform = `translate3d(${Math.round(x)}px, ${Math.round(y)}px, 0)`;
    }
}
