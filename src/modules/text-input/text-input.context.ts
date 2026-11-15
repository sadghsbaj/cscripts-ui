import { createContext } from "svelte";

export interface TextInputContext {
    readonly disabled: boolean;
    readonly readonly: boolean;
    readonly invalid: boolean;
    registerField(el: HTMLInputElement | null): () => void;
}

export const [getTextInputContext, setTextInputContext, hasTextInputContext] =
    createContext<TextInputContext>();
