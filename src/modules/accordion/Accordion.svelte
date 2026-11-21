<script lang="ts" generics="T extends string = string">
    import { SvelteSet } from "svelte/reactivity";
    import { setAccordionContext } from "./accordion-context.internal.ts";
    import type { AccordionProps } from "./index.ts";

    let {
        ref = $bindable<HTMLDivElement | null>(null),
        variant,
        size,
        multiple = false,
        value = $bindable(),
        onValueChange,
        collapsible = false,
        disabled = false,
        keepMounted = true,
        motion = "slide",
        animate = true,
        loop = true,
        class: className,
        children,
        ...rest
    }: AccordionProps<T> = $props();

    const triggerElements = new SvelteSet<HTMLButtonElement>();

    function getOrderedTriggers(): HTMLButtonElement[] {
        return [...triggerElements]
            .filter(
                (el) =>
                    el.isConnected &&
                    !el.disabled &&
                    el.getAttribute("aria-disabled") !== "true",
            )
            .toSorted((a, b) => {
                if (a === b) return 0;
                const pos = a.compareDocumentPosition(b);
                return pos & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
            });
    }

    function isOpen(itemValue: string): boolean {
        if (multiple) {
            return Array.isArray(value) && value.includes(itemValue as T);
        }
        return value === itemValue;
    }

    function toggle(itemValue: string): void {
        if (disabled) return;

        if (multiple) {
            const current = Array.isArray(value) ? value : [];
            const next = (
                current.includes(itemValue as T)
                    ? current.filter((v) => v !== itemValue)
                    : [...current, itemValue as T]
            ) as T[];
            value = next;
            (onValueChange as ((val: T[]) => void) | undefined)?.(next);
            return;
        }

        if (value === itemValue) {
            if (!collapsible) return;
            value = undefined;
            (onValueChange as ((val: T | undefined) => void) | undefined)?.(value);
            return;
        }

        const next = itemValue as T;
        value = next;
        (onValueChange as ((val: T | undefined) => void) | undefined)?.(next);
    }

    function navigateTrigger(current: HTMLButtonElement, key: string): boolean {
        const triggers = getOrderedTriggers();
        if (triggers.length === 0) return false;

        const currentIndex = triggers.indexOf(current);
        let nextIndex = -1;

        switch (key) {
            case "Home": {
                nextIndex = 0;
                break;
            }
            case "End": {
                nextIndex = triggers.length - 1;
                break;
            }
            case "ArrowDown": {
                if (currentIndex === -1) {
                    nextIndex = 0;
                } else if (currentIndex + 1 < triggers.length) {
                    nextIndex = currentIndex + 1;
                } else {
                    nextIndex = loop ? 0 : currentIndex;
                }
                break;
            }
            case "ArrowUp": {
                if (currentIndex === -1) {
                    nextIndex = triggers.length - 1;
                } else if (currentIndex >= 1) {
                    nextIndex = currentIndex - 1;
                } else {
                    nextIndex = loop ? triggers.length - 1 : currentIndex;
                }
                break;
            }
        }

        if (nextIndex < 0) return false;
        triggers[nextIndex]?.focus();
        return true;
    }

    setAccordionContext({
        get disabled() {
            return Boolean(disabled);
        },
        get keepMounted() {
            return Boolean(keepMounted);
        },
        get motion() {
            return motion;
        },
        get animate() {
            return Boolean(animate);
        },
        isOpen,
        toggle,
        registerTrigger(element: HTMLButtonElement): () => void {
            triggerElements.add(element);
            return () => {
                triggerElements.delete(element);
            };
        },
        navigateTrigger,
    });
</script>

<div
    bind:this={ref}
    {...rest}
    class={["cs-accordion", className]}
    data-variant={variant}
    data-size={size}
    data-disabled={disabled ? "" : undefined}
>
    {@render children?.()}
</div>

<style>
    @layer components.composite {
        .cs-accordion {
            --cs-accordion-bg: transparent;
            --cs-accordion-item-bg: transparent;
            --cs-accordion-shadow: none;
            --cs-accordion-item-shadow: none;
            --cs-accordion-item-shadow-hover: var(--cs-shadow-elevated-hover);
            --cs-accordion-divider-color: var(--cs-color-base-soft-hover);
            --cs-accordion-trigger-bg: transparent;
            --cs-accordion-trigger-bg-hover: var(--cs-color-base-soft);
            --cs-accordion-trigger-fg: var(--cs-color-text-strong);
            --cs-accordion-subtitle-fg: var(--cs-color-text-weak);
            --cs-accordion-indicator-fg: var(--cs-color-text-weak);
            --cs-accordion-indicator-fg-hover: var(--cs-color-text-strong);
            --cs-accordion-content-fg: var(--cs-color-text-main);
            --cs-accordion-content-pt: 0px;
            --cs-accordion-focus-offset: 2px;
            --cs-accordion-dur-enter: var(--cs-dur-200);
            --cs-accordion-dur-exit: var(--cs-dur-exit-md);
            --cs-accordion-ease-enter: var(--cs-ease-quart-out);
            --cs-accordion-ease-exit: var(--cs-ease-exit);

            display: flex;
            flex-direction: column;
            min-width: 0;
            background: var(--cs-accordion-bg);
            box-shadow: var(--cs-accordion-shadow);
        }

        /* =========================================================
         * SIZES
         * ========================================================= */
        .cs-accordion[data-size="sm"] {
            --cs-accordion-px: 12px;
            --cs-accordion-trigger-min-height: 40px;
            --cs-accordion-trigger-py: 8px;
            --cs-accordion-trigger-gap: 8px;
            --cs-accordion-title-size: var(--cs-text-sm);
            --cs-accordion-title-lh: 18px;
            --cs-accordion-subtitle-size: var(--cs-text-xs);
            --cs-accordion-content-size: var(--cs-text-sm);
            --cs-accordion-indicator-size: 16px;
            --cs-accordion-content-pt: 6px;
            --cs-accordion-content-pb: 12px;
            --cs-accordion-gap: 6px;
            --cs-accordion-radius: var(--cs-radius-xl);
            --cs-accordion-trigger-radius: var(--cs-radius-lg);
            --cs-accordion-squircle: var(--cs-squircle-smooth);
        }

        .cs-accordion[data-size="md"] {
            --cs-accordion-px: 16px;
            --cs-accordion-trigger-min-height: 48px;
            --cs-accordion-trigger-py: 12px;
            --cs-accordion-trigger-gap: 12px;
            --cs-accordion-title-size: var(--cs-text-base);
            --cs-accordion-title-lh: 20px;
            --cs-accordion-subtitle-size: var(--cs-text-sm);
            --cs-accordion-content-size: var(--cs-text-sm);
            --cs-accordion-indicator-size: 18px;
            --cs-accordion-content-pt: 8px;
            --cs-accordion-content-pb: 16px;
            --cs-accordion-gap: 8px;
            --cs-accordion-radius: var(--cs-radius-2xl);
            --cs-accordion-trigger-radius: var(--cs-radius-xl);
            --cs-accordion-squircle: var(--cs-squircle);
        }

        .cs-accordion[data-size="lg"] {
            --cs-accordion-px: 24px;
            --cs-accordion-trigger-min-height: 56px;
            --cs-accordion-trigger-py: 16px;
            --cs-accordion-trigger-gap: 14px;
            --cs-accordion-title-size: var(--cs-text-lg);
            --cs-accordion-title-lh: 23px;
            --cs-accordion-subtitle-size: var(--cs-text-sm);
            --cs-accordion-content-size: var(--cs-text-base);
            --cs-accordion-indicator-size: 20px;
            --cs-accordion-content-pt: 10px;
            --cs-accordion-content-pb: 20px;
            --cs-accordion-gap: 12px;
            --cs-accordion-radius: var(--cs-radius-3xl);
            --cs-accordion-trigger-radius: var(--cs-radius-2xl);
            --cs-accordion-squircle: var(--cs-squircle);
        }

        /* =========================================================
         * VARIANTS
         * ========================================================= */
        .cs-accordion[data-variant="flush"] {
            --cs-accordion-bg: transparent;
            --cs-accordion-shadow: none;
            --cs-accordion-focus-offset: 2px;
            gap: 2px;

            & :global(.cs-accordion-trigger) {
                border-radius: var(--cs-accordion-trigger-radius);
                corner-shape: var(--cs-squircle-smooth);
            }
        }

        .cs-accordion[data-variant="elevated"] {
            --cs-accordion-bg: var(--cs-color-elevated);
            --cs-accordion-shadow: var(--cs-shadow-elevated);
            --cs-accordion-focus-offset: -2px;
            overflow: clip;
            border-radius: var(--cs-accordion-radius);
            corner-shape: var(--cs-accordion-squircle);

            & > :global(.cs-accordion-item:first-child) > :global(.cs-accordion-trigger),
            & > :global(.cs-accordion-item:first-child) > :global(.cs-accordion-header) > :global(.cs-accordion-trigger) {
                border-start-start-radius: var(--cs-accordion-radius);
                border-start-end-radius: var(--cs-accordion-radius);
                corner-shape: var(--cs-accordion-squircle);
            }

            & > :global(.cs-accordion-item:last-child:not([data-open])) > :global(.cs-accordion-trigger),
            & > :global(.cs-accordion-item:last-child:not([data-open])) > :global(.cs-accordion-header) > :global(.cs-accordion-trigger) {
                border-end-start-radius: var(--cs-accordion-radius);
                border-end-end-radius: var(--cs-accordion-radius);
                corner-shape: var(--cs-accordion-squircle);
            }
        }

        .cs-accordion[data-variant="elevated"] > :global(.cs-accordion-item + .cs-accordion-item)::before {
            content: "";
            display: block;
            height: 1px;
            margin-inline: var(--cs-accordion-px);
            background: var(--cs-color-base-soft);
        }

        .cs-accordion[data-variant="separated"] {
            --cs-accordion-bg: transparent;
            --cs-accordion-item-bg: var(--cs-color-elevated);
            --cs-accordion-item-shadow: var(--cs-shadow-elevated);
            --cs-accordion-trigger-bg-hover: transparent;
            --cs-accordion-focus-offset: -2px;
            gap: var(--cs-accordion-gap);
        }

        .cs-accordion[data-variant="separated"] > :global(.cs-accordion-item) {
            overflow: clip;
            border-radius: var(--cs-accordion-radius);
            corner-shape: var(--cs-accordion-squircle);
            transition: box-shadow var(--cs-dur-effect) var(--cs-ease-effect);

            & > :global(.cs-accordion-trigger),
            & > :global(.cs-accordion-header) > :global(.cs-accordion-trigger) {
                border-start-start-radius: var(--cs-accordion-radius);
                border-start-end-radius: var(--cs-accordion-radius);
                corner-shape: var(--cs-accordion-squircle);
            }
        }

        .cs-accordion[data-variant="separated"] > :global(.cs-accordion-item:not([data-open])) > :global(.cs-accordion-trigger),
        .cs-accordion[data-variant="separated"] > :global(.cs-accordion-item:not([data-open])) > :global(.cs-accordion-header) > :global(.cs-accordion-trigger) {
            border-end-start-radius: var(--cs-accordion-radius);
            border-end-end-radius: var(--cs-accordion-radius);
        }

        @media (hover: hover) {
            .cs-accordion[data-variant="separated"]
                > :global(.cs-accordion-item:not([data-disabled]):has(.cs-accordion-trigger:hover)) {
                box-shadow: var(--cs-accordion-item-shadow-hover);
            }
        }
    }
</style>
