<script lang="ts">
    import { ChevronDown } from "@lucide/svelte";
    import { getAccordionContext, getAccordionItemContext } from "./accordion-context.internal.ts";
    import type { AccordionTriggerProps } from "./index.ts";

    let {
        ref = $bindable<HTMLButtonElement | null>(null),
        leading,
        subtitle,
        indicator,
        class: className,
        onclick,
        onkeydown,
        children,
        ...rest
    }: AccordionTriggerProps = $props();

    const root = getAccordionContext();
    const item = getAccordionItemContext();

    const isInstant = $derived(item.instant || !root.animate || root.motion === "none");

    $effect(() => {
        if (!ref) return;
        return root.registerTrigger(ref);
    });

    function handleClick(event: MouseEvent & { currentTarget: EventTarget & HTMLButtonElement }): void {
        onclick?.(event);
        if (event.defaultPrevented || item.disabled) return;
        item.toggle();
    }

    function handleKeyDown(event: KeyboardEvent & { currentTarget: EventTarget & HTMLButtonElement }): void {
        onkeydown?.(event);
        if (event.defaultPrevented) return;
        if (event.altKey || event.ctrlKey || event.metaKey) return;
        if (event.key !== "ArrowDown" && event.key !== "ArrowUp" && event.key !== "Home" && event.key !== "End") {
            return;
        }

        event.preventDefault();
        event.stopPropagation();
        root.navigateTrigger(event.currentTarget, event.key);
    }
</script>

<button
    bind:this={ref}
    {...rest}
    type="button"
    id={item.triggerId}
    class={["cs-accordion-trigger", className]}
    aria-expanded={item.open ? "true" : "false"}
    aria-controls={item.contentId}
    disabled={item.disabled}
    data-open={item.open ? "" : undefined}
    data-disabled={item.disabled ? "" : undefined}
    data-instant={isInstant ? "" : undefined}
    onclick={handleClick}
    onkeydown={handleKeyDown}
>
    {#if leading}
        <span class="cs-accordion-trigger-leading" aria-hidden="true">
            {@render leading()}
        </span>
    {/if}

    <span class="cs-accordion-trigger-text">
        <span class="cs-accordion-trigger-title">
            {@render children?.()}
        </span>
        {#if subtitle}
            <span class="cs-accordion-trigger-subtitle">{subtitle}</span>
        {/if}
    </span>

    {#if indicator !== false}
        <span class="cs-accordion-indicator" aria-hidden="true">
            {#if indicator}
                {@render indicator({ open: item.open })}
            {:else}
                <ChevronDown strokeWidth={2.25} aria-hidden="true" />
            {/if}
        </span>
    {/if}
</button>

<style>
    @layer components.composite {
        .cs-accordion-trigger {
            display: flex;
            align-items: center;
            width: 100%;
            min-width: 0;
            min-height: var(--cs-accordion-trigger-min-height);
            padding: var(--cs-accordion-trigger-py) var(--cs-accordion-px);
            gap: var(--cs-accordion-trigger-gap);
            background: var(--cs-accordion-trigger-bg);
            color: var(--cs-accordion-trigger-fg);
            border: none;
            text-align: start;
            cursor: default;
            user-select: none;
            transition:
                background-color var(--cs-dur-effect) var(--cs-ease-effect),
                color var(--cs-dur-effect) var(--cs-ease-effect);

            &:focus-visible {
                outline-offset: var(--cs-accordion-focus-offset, 2px);
            }

            @media (hover: hover) {
                &:hover:not(:disabled, [aria-disabled="true"], [data-disabled]) {
                    background: var(--cs-accordion-trigger-bg-hover);

                    & > .cs-accordion-trigger-leading,
                    & > .cs-accordion-indicator {
                        color: var(--cs-accordion-indicator-fg-hover);
                    }
                }
            }

            &:not(:disabled, [aria-disabled="true"], [data-disabled]):active > .cs-accordion-indicator {
                translate: 0 1px;
            }

            &:is(:disabled, [aria-disabled="true"], [data-disabled]) {
                --cs-disabled-opacity: 1;
                color: var(--cs-color-disabled-fg);

                & .cs-accordion-trigger-subtitle,
                & > .cs-accordion-trigger-leading,
                & > .cs-accordion-indicator {
                    color: var(--cs-color-disabled-fg);
                }
            }

            &:has(.cs-accordion-trigger-subtitle) {
                align-items: start;

                & > .cs-accordion-trigger-leading {
                    margin-block-start: calc(
                        (var(--cs-accordion-title-lh) - var(--cs-accordion-indicator-size)) / 2
                    );
                }

                & > .cs-accordion-indicator {
                    align-self: center;
                }
            }
        }

        .cs-accordion-trigger-leading,
        .cs-accordion-indicator {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
            color: var(--cs-accordion-indicator-fg);
            transition: color var(--cs-dur-effect) var(--cs-ease-effect);

            & > :global(svg) {
                width: var(--cs-accordion-indicator-size);
                height: var(--cs-accordion-indicator-size);
                stroke-width: 2.25;
            }
        }

        .cs-accordion-indicator {
            margin-inline-start: auto;
            rotate: 0deg;
            transition:
                rotate var(--cs-accordion-dur-exit) var(--cs-accordion-ease-exit),
                translate var(--cs-dur-press) var(--cs-ease-press),
                color var(--cs-dur-effect) var(--cs-ease-effect);
        }

        .cs-accordion-trigger[data-open] > .cs-accordion-indicator {
            rotate: 180deg;
            color: var(--cs-accordion-indicator-fg-hover);
            transition:
                rotate var(--cs-accordion-dur-enter) var(--cs-accordion-ease-enter),
                translate var(--cs-dur-press) var(--cs-ease-press),
                color var(--cs-dur-effect) var(--cs-ease-effect);
        }

        .cs-accordion-trigger[data-instant] > .cs-accordion-indicator {
            transition: none !important;
        }

        .cs-accordion-trigger-text {
            display: flex;
            flex-direction: column;
            flex: 1 1 auto;
            min-width: 0;
            gap: 2px;
        }

        .cs-accordion-trigger-title {
            font-size: var(--cs-accordion-title-size);
            font-weight: 500;
            line-height: var(--cs-accordion-title-lh);
        }

        .cs-accordion-trigger-subtitle {
            font-size: var(--cs-accordion-subtitle-size);
            font-weight: 400;
            line-height: var(--cs-leading-snug);
            color: var(--cs-accordion-subtitle-fg);
        }
    }
</style>
