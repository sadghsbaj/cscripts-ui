<script lang="ts" generics="T extends string = string">
    import { SvelteMap } from "svelte/reactivity";

    import { setTabsContext } from "./tabs.context.ts";
    import type { TabsProps } from "./tabs.types.ts";
    import "./tabs.css";

    let {
        ref = $bindable(null),
        value = $bindable(),
        onValueChange,
        size,
        orientation = "horizontal",
        width = "content",
        baseline = "full",
        activationMode = "automatic",
        loop = true,
        disabled = false,
        keepMounted = false,
        class: className,
        children,
        ...rest
    }: TabsProps<T> = $props();

    const rootId = $props.id();
    const triggerIds = new SvelteMap<string, string>();
    const triggerElements = new SvelteMap<string, HTMLElement>();
    const panelIds = new SvelteMap<string, string>();

    setTabsContext({
        get rootId() {
            return rootId;
        },
        get value() {
            return value;
        },
        get size() {
            return size;
        },
        get orientation() {
            return orientation;
        },
        get width() {
            return width;
        },
        get baseline() {
            return baseline;
        },
        get activationMode() {
            return activationMode;
        },
        get loop() {
            return Boolean(loop);
        },
        get disabled() {
            return Boolean(disabled);
        },
        get keepMounted() {
            return Boolean(keepMounted);
        },
        get triggerCount() {
            return triggerElements.size;
        },
        isSelected(itemValue: string): boolean {
            return value === itemValue;
        },
        select(itemValue: string): void {
            if (disabled) return;
            if (value === itemValue) return;
            const next = itemValue as T;
            value = next;
            onValueChange?.(next);
        },
        registerTrigger(itemValue: string, id: string, element: HTMLElement): () => void {
            triggerIds.set(itemValue, id);
            triggerElements.set(itemValue, element);
            return () => {
                if (triggerIds.get(itemValue) === id) {
                    triggerIds.delete(itemValue);
                }
                if (triggerElements.get(itemValue) === element) {
                    triggerElements.delete(itemValue);
                }
            };
        },
        registerPanel(itemValue: string, id: string): () => void {
            panelIds.set(itemValue, id);
            return () => {
                if (panelIds.get(itemValue) === id) {
                    panelIds.delete(itemValue);
                }
            };
        },
        getTriggerId(itemValue: string): string | undefined {
            return triggerIds.get(itemValue);
        },
        getPanelId(itemValue: string): string | undefined {
            return panelIds.get(itemValue);
        },
        getTriggerElement(itemValue: string): HTMLElement | undefined {
            return triggerElements.get(itemValue);
        },
    });
</script>

<div
    bind:this={ref}
    {...rest}
    class={["cs-tabs", className]}
    data-size={size}
    data-orientation={orientation}
    data-width={width}
    data-baseline={baseline}
    data-disabled={disabled ? "" : undefined}
>
    {@render children?.()}
</div>
