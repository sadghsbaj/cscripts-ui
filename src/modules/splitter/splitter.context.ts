import { createContext } from "svelte";
import type {
    SplitterDoubleClickAction,
    SplitterExtent,
    SplitterOrientation,
    SplitterSize,
    SplitterVariant,
} from "./splitter.types.ts";

export interface SplitterPaneRegistration {
    readonly id: string;
    readonly hasExplicitId: boolean;
    readonly getElement: () => HTMLDivElement | null;
    readonly getExtentProp: () => SplitterExtent | undefined;
    readonly setExtentProp: (next: SplitterExtent) => void;
    readonly getDefaultExtent: () => SplitterExtent | undefined;
    readonly getMin: () => SplitterExtent;
    readonly getMax: () => SplitterExtent;
    readonly getCollapsible: () => boolean;
    readonly getCollapsed: () => boolean;
    readonly setCollapsed: (next: boolean, fromUser: boolean) => void;
    readonly getCollapsedExtent: () => SplitterExtent;
    readonly getCollapseThreshold: () => number;
}

export interface SplitterHandleRegistration {
    readonly id: string;
    readonly getElement: () => HTMLDivElement | null;
}

export interface SplitterHandleAriaState {
    readonly prevPaneId: string | undefined;
    readonly valuenow: number | undefined;
    readonly valuemin: number | undefined;
    readonly valuemax: number | undefined;
}

export interface SplitterContext {
    readonly orientation: SplitterOrientation;
    readonly variant: SplitterVariant;
    readonly size: SplitterSize;
    readonly disabled: boolean;
    readonly draggingHandleId: string | null;
    registerPane(registration: SplitterPaneRegistration): () => void;
    registerHandle(registration: SplitterHandleRegistration): () => void;
    getPaneBasis(paneId: string): string | undefined;
    getPaneCollapsed(paneId: string): boolean;
    getPaneInert(paneId: string): boolean;
    notifyPaneCollapsedPropChanged(paneId: string, collapsed: boolean): void;
    notifyPaneExtentPropChanged(paneId: string, extent: SplitterExtent): void;
    getHandleAria(handleId: string): SplitterHandleAriaState;
    startDrag(handleId: string, clientPos: number): void;
    updateDrag(handleId: string, clientPos: number): void;
    endDrag(handleId: string): void;
    stepHandle(handleId: string, direction: -1 | 1, step: SplitterExtent): void;
    jumpHandle(handleId: string, target: "min" | "max"): void;
    toggleAdjacentCollapse(handleId: string): void;
    doubleClickHandle(handleId: string, action: SplitterDoubleClickAction): void;
}

export const [getSplitterContext, setSplitterContext, hasSplitterContext] =
    createContext<SplitterContext>();
