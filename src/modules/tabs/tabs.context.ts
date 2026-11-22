import { createContext } from "svelte";

import type {
    TabsActivationMode,
    TabsBaseline,
    TabsOrientation,
    TabsSize,
    TabsWidth,
} from "./tabs.types.ts";

export interface TabsContext {
    readonly rootId: string;
    readonly value: string | undefined;
    readonly size: TabsSize;
    readonly orientation: TabsOrientation;
    readonly width: TabsWidth;
    readonly baseline: TabsBaseline;
    readonly activationMode: TabsActivationMode;
    readonly loop: boolean;
    readonly disabled: boolean;
    readonly keepMounted: boolean;
    readonly triggerCount: number;
    isSelected(itemValue: string): boolean;
    select(itemValue: string): void;
    registerTrigger(itemValue: string, id: string, element: HTMLElement): () => void;
    registerPanel(itemValue: string, id: string): () => void;
    getTriggerId(itemValue: string): string | undefined;
    getPanelId(itemValue: string): string | undefined;
    getTriggerElement(itemValue: string): HTMLElement | undefined;
}

export const [getTabsContext, setTabsContext, hasTabsContext] = createContext<TabsContext>();
