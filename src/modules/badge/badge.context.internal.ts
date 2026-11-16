import { createContext } from "svelte";
import type { BadgeSize, BadgeVariant } from "./index.ts";

export interface BadgeContext {
    readonly variant: BadgeVariant;
    readonly size: BadgeSize;
}

export const [getBadgeContext, setBadgeContext, hasBadgeContext] = createContext<BadgeContext>();
