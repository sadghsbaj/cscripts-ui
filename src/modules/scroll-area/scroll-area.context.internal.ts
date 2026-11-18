import { createContext } from "svelte";

import type { ScrollAreaManager } from "./scroll-area-state.internal.svelte.ts";

export const [getScrollAreaContext, setScrollAreaContext, hasScrollAreaContext] = createContext<ScrollAreaManager>();
