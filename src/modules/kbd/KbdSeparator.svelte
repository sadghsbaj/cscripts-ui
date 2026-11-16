<script lang="ts">
    import { getKbdGroupContext, hasKbdGroupContext } from "./kbd.context.internal.ts";
    import type { KbdSeparatorProps } from "./index.ts";

    let { ref = $bindable(null), class: className, children, ...rest }: KbdSeparatorProps = $props();

    const group = hasKbdGroupContext() ? getKbdGroupContext() : null;
    const inset = $derived(group?.size === "sm" || group?.size === "lg" ? 5.5 : 5);
    const far = $derived(24 - inset);
</script>

<span bind:this={ref} {...rest} aria-hidden="true" class={["cs-kbd-separator", className]}>
    {#if children}
        {@render children()}
    {:else}
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.25"
            stroke-linecap="round"
            aria-hidden="true"
            class="cs-kbd-separator-icon"
        >
            <path d={`M12 ${inset}V${far}M${inset} 12H${far}`} />
        </svg>
    {/if}
</span>

<style>
    @layer components.primitive {
        .cs-kbd-separator {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
            block-size: var(--cs-kbd-separator-height, auto);
            color: var(--cs-color-text-weak);
            font-family: var(--cs-font-sans);
            font-size: var(--cs-kbd-separator-size);
            font-weight: 400;
            line-height: var(--cs-leading-none);
            margin-block-end: var(--cs-kbd-separator-offset, 0px);
            white-space: nowrap;
            user-select: none;

            & .cs-kbd-separator-icon {
                flex-shrink: 0;
                inline-size: var(--cs-kbd-separator-size);
                block-size: var(--cs-kbd-separator-size);
            }
        }
    }
</style>
