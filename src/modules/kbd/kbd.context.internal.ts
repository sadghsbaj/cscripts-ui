import { createContext } from "svelte";
import type { KbdSize, KbdVariant } from "./index.ts";

export interface KbdGroupContext {
    readonly variant: KbdVariant;
    readonly size: KbdSize;
}

export const [getKbdGroupContext, setKbdGroupContext, hasKbdGroupContext] =
    createContext<KbdGroupContext>();
