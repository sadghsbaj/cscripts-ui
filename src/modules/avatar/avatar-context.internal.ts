import { createContext } from "svelte";

import type { AvatarSize, AvatarVariant } from "./index.ts";

export interface AvatarGroupContext {
    readonly variant: AvatarVariant;
    readonly size: AvatarSize;
    readonly disabled: boolean;
    readonly overlap: boolean;
    registerItem(element: HTMLElement): () => void;
    isOverflowHidden(element: HTMLElement | null): boolean;
}

export const [getAvatarGroupContext, setAvatarGroupContext, hasAvatarGroupContext] =
    createContext<AvatarGroupContext>();
