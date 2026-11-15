import { createContext } from "svelte";
import { SvelteMap } from "svelte/reactivity";

/**
 * Options for creating a headless form control group state container.
 */
export interface ControlGroupOptions {
    /** Getter returning the currently selected values. */
    value: () => readonly string[] | undefined;
    /** Updates the underlying value binding (for example, a `$bindable` prop). */
    setValue?: (next: string[]) => void;
    /** Callback invoked after the group value changes. */
    onValueChange?: (next: string[]) => void;
    /** Getter returning the optional form field name shared by group items. */
    name?: () => string | undefined;
    /** Getter returning whether the entire group is disabled. */
    disabled?: () => boolean | undefined;
    /** Getter returning whether the group is in an invalid state. */
    invalid?: () => boolean | undefined;
}

/**
 * Options passed by an individual item when registering with a control group.
 */
export interface ControlGroupItemOptions {
    /** Getter returning the item's value within the group. */
    value: () => string;
    /** Getter returning whether this specific item is disabled. */
    disabled?: () => boolean | undefined;
}

/**
 * Reactive context API exposed by a headless control group.
 */
export interface ControlGroupContext {
    /** Normalized array of currently selected values. */
    readonly value: readonly string[];
    /** Shared form field name for items in the group. */
    readonly name: string | undefined;
    /** Whether the entire group is disabled. */
    readonly disabled: boolean;
    /** Whether the group is in an invalid state. */
    readonly invalid: boolean;
    /** Whether at least one item is currently registered in the group. */
    readonly hasRegisteredItems: boolean;
    /** Whether all registered enabled items are selected (requires at least one enabled item). */
    readonly isAllSelected: boolean;
    /** Whether some, but not all, registered enabled items are selected. */
    readonly isIndeterminate: boolean;
    /** Returns `true` if `itemValue` is currently selected. */
    isSelected(itemValue: string): boolean;
    /** Selects or deselects `itemValue`, committing a fresh array if state changed. */
    setSelected(itemValue: string, next: boolean): void;
    /** Toggles the selection state of `itemValue`. */
    toggle(itemValue: string): void;
    /** Registers a group item for aggregate selection tracking and returns a cleanup callback. */
    registerItem(options: ControlGroupItemOptions): () => void;
    /** Toggles selection across all registered enabled items. */
    toggleAll(): void;
    /** Selects or deselects all registered enabled items while preserving disabled/unregistered values. */
    setAllSelected(next: boolean): void;
}

/**
 * Creates a typed Svelte context tuple (`[get, set, has]`) for a control group.
 */
export function createControlGroupContext<
    TContext extends ControlGroupContext = ControlGroupContext,
>(): ReturnType<typeof createContext<TContext>> {
    return createContext<TContext>();
}

/**
 * Creates a headless, reactive form control group state container.
 */
export function createControlGroup(options: ControlGroupOptions): ControlGroupContext {
    const items = new SvelteMap<symbol, ControlGroupItemOptions>();

    const value = $derived.by((): readonly string[] => {
        const raw = options.value();
        return Array.isArray(raw) ? raw : [];
    });

    const name = $derived(options.name?.());
    const disabled = $derived(Boolean(options.disabled?.()));
    const invalid = $derived(Boolean(options.invalid?.()));
    const hasRegisteredItems = $derived(items.size > 0);

    const enabledValues = $derived.by((): string[] => {
        const next: string[] = [];
        for (const item of items.values()) {
            if (!item.disabled?.()) {
                next.push(item.value());
            }
        }
        return next;
    });

    const isAllSelected = $derived(
        enabledValues.length > 0 && enabledValues.every((itemValue) => value.includes(itemValue)),
    );

    const isIndeterminate = $derived(
        !isAllSelected && enabledValues.some((itemValue) => value.includes(itemValue)),
    );

    function commit(nextValue: string[]): void {
        options.setValue?.(nextValue);
        options.onValueChange?.(nextValue);
    }

    function isSelected(itemValue: string): boolean {
        return value.includes(itemValue);
    }

    function setSelected(itemValue: string, next: boolean): void {
        if (disabled || isSelected(itemValue) === next) return;

        if (!next) {
            commit(value.filter((entry) => entry !== itemValue));
            return;
        }

        const nextValue: string[] = [];
        for (const entry of value) {
            if (!nextValue.includes(entry)) nextValue.push(entry);
        }
        if (!nextValue.includes(itemValue)) nextValue.push(itemValue);

        commit(nextValue);
    }

    function toggle(itemValue: string): void {
        setSelected(itemValue, !isSelected(itemValue));
    }

    function registerItem(itemOptions: ControlGroupItemOptions): () => void {
        const id = Symbol();
        items.set(id, itemOptions);
        return () => {
            items.delete(id);
        };
    }

    function setAllSelected(next: boolean): void {
        if (disabled || enabledValues.length === 0) return;

        if (next) {
            const nextValue = [...value];
            let changed = false;

            for (const itemValue of enabledValues) {
                if (nextValue.includes(itemValue)) continue;
                nextValue.push(itemValue);
                changed = true;
            }

            if (!changed) return;
            commit(nextValue);
            return;
        }

        const nextValue = value.filter((entry) => !enabledValues.includes(entry));
        if (nextValue.length === value.length) return;

        commit(nextValue);
    }

    function toggleAll(): void {
        setAllSelected(!isAllSelected);
    }

    return {
        get value() {
            return value;
        },
        get name() {
            return name;
        },
        get disabled() {
            return disabled;
        },
        get invalid() {
            return invalid;
        },
        isSelected,
        setSelected,
        toggle,
        registerItem,
        get hasRegisteredItems() {
            return hasRegisteredItems;
        },
        get isAllSelected() {
            return isAllSelected;
        },
        get isIndeterminate() {
            return isIndeterminate;
        },
        toggleAll,
        setAllSelected,
    };
}
