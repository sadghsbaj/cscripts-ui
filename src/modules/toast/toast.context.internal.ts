import { createContext } from "svelte";

import type { ToastColor } from "./index.ts";

export interface ToastContext {
    readonly color: ToastColor;
    readonly dismissible: boolean;
    readonly onDismiss?: () => void;
}

export const [getToastContext, setToastContext, hasToastContext] = createContext<ToastContext>();
