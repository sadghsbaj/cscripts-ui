<script lang="ts">
    import "../../shared/button-control/button-control-group.css";
    import { setToggleButtonGroupContext, type ToggleButtonGroupProps } from "./index.ts";

    let {
        ref = $bindable(null),
        type,
        value = $bindable(),
        allowDeselect = false,
        orientation = "horizontal",
        disabled = false,
        onValueChange,
        class: className,
        children,
        ...rest
    }: ToggleButtonGroupProps = $props();

    setToggleButtonGroupContext({
        get type() {
            return type;
        },
        get orientation() {
            return orientation;
        },
        get disabled() {
            return Boolean(disabled);
        },
        isSelected(itemValue: string): boolean {
            if (type === "single") {
                return value === itemValue;
            }
            return Array.isArray(value) && value.includes(itemValue);
        },
        toggle(itemValue: string): void {
            if (disabled) return;

            if (type === "single") {
                if (value === itemValue && !allowDeselect) return;
                const next = value === itemValue ? undefined : itemValue;
                value = next;
                (onValueChange as ((val: string | undefined) => void) | undefined)?.(next);
                return;
            }

            const current = Array.isArray(value) ? value : [];
            const next = current.includes(itemValue) ? current.filter((v) => v !== itemValue) : [...current, itemValue];
            value = next;
            (onValueChange as ((next: string[]) => void) | undefined)?.(next);
        },
    });
</script>

<div
    bind:this={ref}
    role="group"
    {...rest}
    aria-disabled={disabled ? "true" : undefined}
    class={["cs-toggle-button-group", "cs-button-control-group", className]}
    data-type={type}
    data-orientation={orientation}
    data-fixed-selection={type === "single" && !allowDeselect ? "" : undefined}
    data-disabled={disabled ? "" : undefined}
>
    {@render children?.()}
</div>

<style>
    @layer components.composite {
        .cs-toggle-button-group {
            --cs-button-control-group-inner-radius: var(--cs-toggle-button-group-inner-radius, var(--cs-radius-none));
            --cs-toggle-button-group-separator-fg: var(--cs-color-base-soft-fg);
            --cs-toggle-button-group-separator-alpha: 18%;

            /* Keep outer surface stationary on all group items so adjacent segments stay flush. */
            & > :global(.cs-toggle-button) {
                --cs-toggle-button-squash-active: 1;
                --cs-toggle-button-focus-scale-active: 1;
                --cs-button-control-squash-active: 1;
                --cs-button-control-focus-scale-active: 1;

                & > :global(:is(.cs-toggle-button-icon, .cs-toggle-button-label)) {
                    scale: 1;
                    transition: scale var(--cs-dur-effect) var(--cs-ease-effect);
                }

                &:active:not(:disabled) > :global(:is(.cs-toggle-button-icon, .cs-toggle-button-label)) {
                    scale: 0.94;
                    transition: scale var(--cs-dur-press) var(--cs-ease-press);
                }
            }

            /* In fixed single-selection mode (segmented control), clicking the already-active
             * item is a no-op. Keep inner content stationary on press. */
            &[data-fixed-selection] > :global(.cs-toggle-button[aria-pressed="true"]:active) > :global(:is(.cs-toggle-button-icon, .cs-toggle-button-label)) {
                scale: 1;
            }

            /* Automatic centered seam separators between adjacent buttons.
             * Keep &::after nested so Prettier never inserts whitespace between :global(...) and ::after. */
            & > :global(.cs-toggle-button:not(:last-child)) {
                &::after {
                    content: "";
                    position: absolute;
                    z-index: 1;
                    pointer-events: none;
                    background-color: color-mix(
                        in oklab,
                        var(--cs-toggle-button-group-separator-fg) var(--cs-toggle-button-group-separator-alpha),
                        transparent
                    );
                    transition:
                        opacity var(--cs-dur-effect) var(--cs-ease-effect),
                        background-color var(--cs-dur-effect) var(--cs-ease-effect);
                }

                /* Auto-hide when either neighbor is pressed, active, or focused.
                 * Avoid &:is(...) here because Svelte adds :where(.svelte-*) inside :is() on &. */
                &[aria-pressed="true"],
                &:active,
                &:focus-visible,
                &:has(+ :global(.cs-toggle-button:is([aria-pressed="true"], :active, :focus-visible))) {
                    &::after {
                        opacity: 0;
                    }
                }

                /* Re-emerge in type="multiple" when both neighbors are pressed (non-hover devices). */
                @media not (hover: hover) {
                    &[aria-pressed="true"]:not(:active, :focus-visible):has(
                        + :global(.cs-toggle-button[aria-pressed="true"]:not(:active, :focus-visible))
                    ) {
                        &::after {
                            opacity: 1;
                        }
                    }
                }

                /* Hover auto-hide and re-emerge gated to hover-capable pointers to avoid sticky mobile hover. */
                @media (hover: hover) {
                    &:hover,
                    &:has(+ :global(.cs-toggle-button:hover)) {
                        &::after {
                            opacity: 0;
                        }
                    }

                    &[aria-pressed="true"]:not(:hover, :active, :focus-visible):has(
                        + :global(.cs-toggle-button[aria-pressed="true"]:not(:hover, :active, :focus-visible))
                    ) {
                        &::after {
                            opacity: 1;
                        }
                    }
                }

                /* Semantic color matching when both neighbors are pressed. */
                &[aria-pressed="true"]:has(+ :global(.cs-toggle-button[aria-pressed="true"])) {
                    &[data-color="accent"] {
                        --cs-toggle-button-group-separator-fg: var(--cs-color-accent-soft-fg);
                    }

                    &[data-color="positive"] {
                        --cs-toggle-button-group-separator-fg: var(--cs-color-positive-soft-fg);
                    }

                    &[data-color="caution"] {
                        --cs-toggle-button-group-separator-fg: var(--cs-color-caution-soft-fg);
                    }

                    &[data-color="negative"] {
                        --cs-toggle-button-group-separator-fg: var(--cs-color-negative-soft-fg);
                    }
                }
            }

            &[data-orientation="horizontal"] > :global(.cs-toggle-button:not(:last-child)) {
                &::after {
                    inset-block: 22%;
                    right: 0;
                    width: 1px;
                    translate: 50% 0;
                }
            }

            &[data-orientation="vertical"] > :global(.cs-toggle-button:not(:last-child)) {
                &::after {
                    inset-inline: 16%;
                    bottom: 0;
                    height: 1px;
                    translate: 0 50%;
                }
            }
        }
    }
</style>
