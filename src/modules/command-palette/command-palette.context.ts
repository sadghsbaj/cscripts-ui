import { createContext } from "svelte";

import type { CommandPaletteContext } from "./index.ts";

export const [getCommandPaletteContext, setPublicCommandPaletteContext, hasCommandPaletteContext] =
    createContext<CommandPaletteContext>();
