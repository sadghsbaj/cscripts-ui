<script lang="ts">
    import "./avatar.internal.css";

    import { untrack } from "svelte";
    import { SvelteSet } from "svelte/reactivity";

    import { setAvatarGroupContext } from "./avatar-context.internal.ts";
    import { getAvatarOverflowLabel } from "./avatar-utils.internal.ts";
    import type { AvatarGroupProps } from "./index.ts";

    let {
        ref = $bindable(null),
        variant,
        size,
        max,
        overlap = true,
        disabled = false,
        class: className,
        children,
        ...rest
    }: AvatarGroupProps = $props();

    const items = new SvelteSet<HTMLElement>();

    // Sort registered items in live DOM order without querying the DOM
    const orderedItems = $derived.by(() =>
        [...items]
            .filter((el) => el.isConnected)
            .toSorted((a, b) => {
                if (a === b) return 0;
                const pos = a.compareDocumentPosition(b);
                return pos & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
            }),
    );

    const clampedMax = $derived(
        max !== undefined && Number.isFinite(max) ? Math.max(0, Math.floor(max)) : undefined,
    );
    const overflowCount = $derived(
        clampedMax === undefined ? 0 : Math.max(0, orderedItems.length - clampedMax),
    );

    setAvatarGroupContext({
        get variant() {
            return variant;
        },
        get size() {
            return size;
        },
        get disabled() {
            return Boolean(disabled);
        },
        get overlap() {
            return Boolean(overlap);
        },
        registerItem(element: HTMLElement): () => void {
            untrack(() => {
                items.add(element);
            });
            return () => {
                untrack(() => {
                    items.delete(element);
                });
            };
        },
        isOverflowHidden(element: HTMLElement | null): boolean {
            if (!element || clampedMax === undefined) return false;
            const index = orderedItems.indexOf(element);
            return index !== -1 && index >= clampedMax;
        },
    });
</script>

<div
    bind:this={ref}
    role="group"
    {...rest}
    aria-disabled={disabled ? "true" : undefined}
    class={["cs-avatar-group", className]}
    data-variant={variant}
    data-size={size}
    data-overlap={overlap ? "" : undefined}
    data-disabled={disabled ? "" : undefined}
>
    {@render children?.()}
    {#if overflowCount > 0}
        <span
            class="cs-avatar cs-avatar-overflow"
            role="img"
            aria-label={getAvatarOverflowLabel(overflowCount)}
            data-variant={variant}
            data-size={size}
            data-color="base"
            data-pattern="none"
            data-disabled={disabled ? "" : undefined}
        >
            <span class="cs-avatar-surface" aria-hidden="true">
                <span class="cs-avatar-content">+{overflowCount}</span>
            </span>
        </span>
    {/if}
</div>
