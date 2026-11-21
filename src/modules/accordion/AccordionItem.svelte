<script lang="ts" generics="T extends string = string">
    import { onMount, untrack } from "svelte";
    import { getAccordionContext, setAccordionItemContext } from "./accordion-context.internal.ts";
    import type { AccordionItemProps } from "./index.ts";

    const uid = $props.id();
    const triggerId = `${uid}-trigger`;
    const contentId = `${uid}-content`;

    let {
        ref = $bindable<HTMLDivElement | null>(null),
        value,
        disabled = false,
        class: className,
        children,
        ...rest
    }: AccordionItemProps<T> = $props();

    const root = getAccordionContext();
    const open = $derived(root.isOpen(value));
    const isDisabled = $derived(Boolean(root.disabled || disabled));

    // Suppress chevron rotation on initial mount if item starts open.
    let mountedInstant = $state(untrack(() => root.isOpen(value)));

    onMount(() => {
        if (!mountedInstant || typeof requestAnimationFrame !== "function") {
            mountedInstant = false;
            return;
        }
        const rafId = requestAnimationFrame(() => {
            mountedInstant = false;
        });
        return () => cancelAnimationFrame(rafId);
    });

    setAccordionItemContext({
        get value() {
            return value;
        },
        get open() {
            return open;
        },
        get disabled() {
            return isDisabled;
        },
        get instant() {
            return mountedInstant;
        },
        triggerId,
        contentId,
        toggle(): void {
            if (isDisabled) return;
            root.toggle(value);
        },
    });
</script>

<div
    bind:this={ref}
    {...rest}
    class={["cs-accordion-item", className]}
    data-open={open ? "" : undefined}
    data-disabled={isDisabled ? "" : undefined}
    data-instant={mountedInstant ? "" : undefined}
>
    {@render children?.()}
</div>

<style>
    @layer components.composite {
        /* Zero gap ensures a collapsed Collapsible (0fr) adds no phantom spacing. */
        .cs-accordion-item {
            display: flex;
            flex-direction: column;
            gap: 0;
            min-width: 0;
            background: var(--cs-accordion-item-bg, transparent);
            box-shadow: var(--cs-accordion-item-shadow, none);
        }
    }
</style>
