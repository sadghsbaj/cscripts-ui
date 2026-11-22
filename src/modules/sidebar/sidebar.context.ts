import { createContext } from "svelte";
import type {
    SidebarBehavior,
    SidebarCollapseMode,
    SidebarSide,
    SidebarSize,
    SidebarVariant,
    SidebarViewInitialFocus,
    SidebarViewTransition,
} from "./sidebar.types.ts";

export interface SidebarContext {
    readonly id: string;
    readonly variant: SidebarVariant;
    readonly size: SidebarSize;
    readonly side: SidebarSide;
    readonly behavior: SidebarBehavior;
    readonly collapseMode: SidebarCollapseMode;
    readonly open: boolean;
    readonly animate: boolean;
    readonly isRailCollapsed: boolean;
    readonly isOverlay: boolean;
    readonly isFullyHidden: boolean;
    toggle(): void;
    setOpen(next: boolean): void;
}

export interface SidebarGroupContext {
    readonly open: boolean;
    readonly effectiveOpen: boolean;
    readonly disabled: boolean;
    readonly keepMounted: boolean;
    readonly animate: boolean;
    readonly depth: number;
    readonly triggerId: string;
    readonly contentId: string;
    toggle(): void;
    setOpen(next: boolean): void;
}

export type SidebarViewStageState = "active" | "entering" | "exiting" | "idle";

export interface SidebarViewRegistration {
    getElement: () => HTMLDivElement | null;
    getInitialFocus: () => SidebarViewInitialFocus;
}

export interface SidebarViewsContext {
    readonly activeValue: string;
    readonly outgoingValue: string | null;
    readonly transition: SidebarViewTransition;
    readonly direction: "forward" | "backward";
    readonly animate: boolean;
    readonly keepMounted: boolean;
    readonly ready: boolean;
    readonly pendingFocusHandoff: boolean;
    getViewState(value: string): SidebarViewStageState;
    shouldRenderView(value: string): boolean;
    registerView(value: string, registration: SidebarViewRegistration): () => void;
    notifyViewTransitionEnd(value: string): void;
    completeFocusHandoff(value: string): void;
}

export const [getSidebarContext, setSidebarContext, hasSidebarContext] =
    createContext<SidebarContext>();

export const [getSidebarGroupContext, setSidebarGroupContext, hasSidebarGroupContext] =
    createContext<SidebarGroupContext>();

export const [getSidebarViewsContext, setSidebarViewsContext, hasSidebarViewsContext] =
    createContext<SidebarViewsContext>();
