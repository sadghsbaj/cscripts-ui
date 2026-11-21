import { t } from "../../shared/lang.internal.ts";
import type { DndActiveItem, DndAnnouncements, DndOverTarget } from "./dnd.types.ts";

let instructionsCounter = 0;

function createDefaultAnnouncements(): DndAnnouncements {
    return {
        instructions: t({
            de: "Leertaste zum Aufnehmen drücken, Pfeiltasten zum Bewegen, Leertaste zum Ablegen, Escape zum Abbrechen.",
            en: "Press Space to pick up, Arrow keys to move, Space to drop, Escape to cancel.",
        }),
        roleDescription: t({
            de: "Ziehbares Element",
            en: "Draggable item",
        }),
        onDragStart: (item: DndActiveItem<unknown>): string =>
            t({
                de: `${item.label} aufgenommen.`,
                en: `Picked up ${item.label}.`,
            }),
        onDragOver: (item: DndActiveItem<unknown>, over: DndOverTarget<unknown> | null): string => {
            if (!over) {
                return t({
                    de: `${item.label} befindet sich über keinem Zielbereich.`,
                    en: `${item.label} is no longer over a drop target.`,
                });
            }
            if (!over.isValid) {
                return t({
                    de: `${item.label} kann hier nicht abgelegt werden.`,
                    en: `${item.label} cannot be dropped here.`,
                });
            }
            if (over.position === "inside") {
                return t({
                    de: `${item.label} innerhalb des Zielknotens.`,
                    en: `${item.label} inside target node.`,
                });
            }
            if (over.position === "before") {
                return t({
                    de: `${item.label} vor Zielposition.`,
                    en: `${item.label} before target position.`,
                });
            }
            if (over.position === "after") {
                return t({
                    de: `${item.label} nach Zielposition.`,
                    en: `${item.label} after target position.`,
                });
            }
            if (over.index !== null) {
                return t({
                    de: `${item.label} an Position ${over.index + 1}.`,
                    en: `${item.label} moved to position ${over.index + 1}.`,
                });
            }
            return t({
                de: `${item.label} über Zielbereich.`,
                en: `${item.label} over drop zone.`,
            });
        },
        onDrop: (item: DndActiveItem<unknown>, over: DndOverTarget<unknown> | null): string => {
            if (over && over.index !== null) {
                return t({
                    de: `${item.label} an Position ${over.index + 1} abgelegt.`,
                    en: `Dropped ${item.label} at position ${over.index + 1}.`,
                });
            }
            return t({
                de: `${item.label} abgelegt.`,
                en: `Dropped ${item.label}.`,
            });
        },
        onDragCancel: (item: DndActiveItem<unknown>): string =>
            t({
                de: `Ziehen von ${item.label} abgebrochen.`,
                en: `Dragging ${item.label} cancelled.`,
            }),
    };
}

/**
 * Manages the shared visually-hidden `aria-live="assertive"` region and
 * `aria-describedby` keyboard instructions node.
 */
export class DndAnnouncer {
    readonly messages: DndAnnouncements;
    private liveEl: HTMLDivElement | null = null;
    private instructionsEl: HTMLDivElement | null = null;
    private instructionsId: string;

    constructor(overrides?: Partial<DndAnnouncements>) {
        this.messages = { ...createDefaultAnnouncements(), ...overrides };
        instructionsCounter += 1;
        this.instructionsId = `cs-dnd-instructions-${instructionsCounter}`;
    }

    ensureInstructionsId(): string {
        if (typeof document === "undefined") {
            return this.instructionsId;
        }
        if (!this.instructionsEl || !this.instructionsEl.isConnected) {
            const el = document.createElement("div");
            el.id = this.instructionsId;
            el.className = "cs-dnd-announcer";
            el.textContent = this.messages.instructions;
            document.body.append(el);
            this.instructionsEl = el;
        }
        return this.instructionsId;
    }

    announce(message: string): void {
        if (typeof document === "undefined" || !message) return;

        if (!this.liveEl || !this.liveEl.isConnected) {
            const el = document.createElement("div");
            el.className = "cs-dnd-announcer";
            el.setAttribute("role", "status");
            el.setAttribute("aria-live", "assertive");
            el.setAttribute("aria-atomic", "true");
            document.body.append(el);
            this.liveEl = el;
        }

        // Clearing before assigning ensures repeated identical messages still announce.
        this.liveEl.textContent = "";
        queueMicrotask(() => {
            if (this.liveEl && this.liveEl.isConnected) {
                this.liveEl.textContent = message;
            }
        });
    }

    destroy(): void {
        this.liveEl?.remove();
        this.liveEl = null;
        this.instructionsEl?.remove();
        this.instructionsEl = null;
    }
}
