import { SvelteMap } from "svelte/reactivity";

import { sortListboxItemsByDomOrder } from "./listbox-utils.ts";

export interface ListboxRegistryEntry {
    value: string;
    element: HTMLElement | null;
}

export interface ListboxRegistry<T extends ListboxRegistryEntry> {
    readonly items: SvelteMap<string, T>;
    register: (meta: T) => () => void;
    get: (value: string) => T | undefined;
    getOrdered: (predicate?: (item: T) => boolean) => T[];
}

export function createListboxRegistry<T extends ListboxRegistryEntry>(): ListboxRegistry<T> {
    const items = new SvelteMap<string, T>();

    return {
        items,
        register(meta: T): () => void {
            items.set(meta.value, meta);
            return () => {
                if (items.get(meta.value) === meta) {
                    items.delete(meta.value);
                }
            };
        },
        get(value: string): T | undefined {
            return items.get(value);
        },
        getOrdered(predicate?: (item: T) => boolean): T[] {
            const list = predicate ? items.values().filter((item) => predicate(item)).toArray() : items.values().toArray();
            return sortListboxItemsByDomOrder(list);
        },
    };
}
