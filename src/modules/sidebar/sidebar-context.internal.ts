import { createContext } from "svelte";

export interface SidebarSectionContext {
    readonly collapsible: boolean;
    readonly open: boolean;
    readonly contentId: string;
    readonly animate: boolean;
    toggle(): void;
    registerLabelId(id: string): () => void;
    getHeaderSlot(): HTMLDivElement | null;
}

export interface SidebarSectionHeaderContext {
    readonly insideHeader: boolean;
}

export interface SidebarItemContext {
    registerLabelElement(element: HTMLElement | null): () => void;
}

export const [getSidebarSectionContext, setSidebarSectionContext, hasSidebarSectionContext] =
    createContext<SidebarSectionContext>();

export const [
    getSidebarSectionHeaderContext,
    setSidebarSectionHeaderContext,
    hasSidebarSectionHeaderContext,
] = createContext<SidebarSectionHeaderContext>();

export const [getSidebarItemContext, setSidebarItemContext, hasSidebarItemContext] =
    createContext<SidebarItemContext>();

export function extractSidebarItemLabel(
    labelEl: HTMLElement | null,
    rootEl: HTMLElement | null
): string {
    if (labelEl) {
        return labelEl.textContent?.trim() ?? "";
    }
    if (!rootEl) return "";

    let text = "";
    for (const child of rootEl.childNodes) {
        if (
            child.nodeType === Node.TEXT_NODE ||
            (child instanceof HTMLElement &&
                !child.classList.contains("cs-badge") &&
                !child.classList.contains("cs-sidebar-item-badge") &&
                !child.classList.contains("cs-sidebar-item-icon") &&
                !child.classList.contains("cs-sidebar-group-chevron") &&
                !child.classList.contains("cs-hit-area"))
        ) {
            text += child.textContent ?? "";
        }
    }
    return text.trim();
}
