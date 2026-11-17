<script lang="ts">
    import type { ToastProps } from "./index.ts";
    import { setToastContext } from "./toast.context.internal.ts";

    let {
        ref = $bindable(null),
        color,
        dismissible = true,
        onDismiss,
        class: className,
        children,
        ...rest
    }: ToastProps = $props();

    setToastContext({
        get color() {
            return color;
        },
        get dismissible() {
            return dismissible;
        },
        get onDismiss() {
            return onDismiss;
        },
    });
</script>

<div
    bind:this={ref}
    {...rest}
    role={color === "negative" ? "alert" : "status"}
    aria-live={color === "negative" ? "assertive" : "polite"}
    aria-atomic="true"
    class={["cs-toast", className]}
    data-color={color}
    data-dismissible={dismissible ? "" : undefined}
>
    {@render children?.()}
</div>

<style>
    @layer components.composite {
        .cs-toast {
            --cs-toast-bg: var(--cs-color-elevated);
            --cs-toast-shadow: var(--cs-shadow-floating);
            --cs-toast-radius: var(--cs-radius-2xl);
            --cs-toast-px: 14px;
            --cs-toast-py: 12px;
            --cs-toast-description-lines: 4;

            position: relative;
            display: grid;
            grid-template-columns: minmax(0, 1fr);
            align-items: center;
            column-gap: 10px;
            inline-size: 100%;
            block-size: 100%;
            overflow: hidden;
            padding: var(--cs-toast-py) var(--cs-toast-px);
            border-radius: var(--cs-toast-radius);
            corner-shape: var(--cs-squircle-smooth);
            background-color: var(--cs-toast-bg);
            box-shadow: var(--cs-toast-shadow);
            color: var(--cs-color-text-main);

            /* Semantic icon color tokens */
            &[data-color="base"] {
                --cs-toast-icon-fg: var(--cs-color-text-main);
            }

            &[data-color="accent"] {
                --cs-toast-icon-fg: var(--cs-color-accent-soft-fg);
            }

            &[data-color="positive"] {
                --cs-toast-icon-fg: var(--cs-color-positive-soft-fg);
            }

            &[data-color="caution"] {
                --cs-toast-icon-fg: var(--cs-color-caution-soft-fg);
            }

            &[data-color="negative"] {
                --cs-toast-icon-fg: var(--cs-color-negative-soft-fg);
            }

            > :global(.cs-toast-title) {
                grid-column: 1;
                grid-row: 1;
            }

            > :global(.cs-toast-close) {
                grid-column: 2;
                grid-row: 1;
            }

            /* With leading icon */
            &:has(> :global(.cs-toast-icon)) {
                grid-template-columns: 18px minmax(0, 1fr);

                > :global(.cs-toast-icon) {
                    grid-column: 1;
                    grid-row: 1;
                }

                > :global(.cs-toast-title),
                > :global(.cs-toast-description) {
                    grid-column: 2;
                }

                > :global(.cs-toast-close) {
                    grid-column: 3;
                }
            }

            /* Single-line trailing controls (inline action and/or close, no description) */
            &:not(:has(> :global(.cs-toast-description))) {
                &:has(> :global(.cs-toast-action)),
                &:has(> :global(.cs-toast-close)) {
                    grid-template-columns: minmax(0, 1fr) auto;
                }

                &:has(> :global(.cs-toast-action)):has(> :global(.cs-toast-close)) {
                    grid-template-columns: minmax(0, 1fr) auto auto;
                }

                &:has(> :global(.cs-toast-icon)):has(> :global(.cs-toast-action)),
                &:has(> :global(.cs-toast-icon)):has(> :global(.cs-toast-close)) {
                    grid-template-columns: 18px minmax(0, 1fr) auto;
                }

                &:has(> :global(.cs-toast-icon)):has(> :global(.cs-toast-action)):has(> :global(.cs-toast-close)) {
                    grid-template-columns: 18px minmax(0, 1fr) auto auto;
                }

                > :global(.cs-toast-action) {
                    grid-column: 2;
                    grid-row: 1;
                }

                &:has(> :global(.cs-toast-icon)) > :global(.cs-toast-action) {
                    grid-column: 3;
                }

                &:has(> :global(.cs-toast-action)) > :global(.cs-toast-close) {
                    grid-column: 3;
                }

                &:has(> :global(.cs-toast-icon)):has(> :global(.cs-toast-action)) > :global(.cs-toast-close) {
                    grid-column: 4;
                }
            }

            /* Multi-line with description: icon & close align to top, action moves below description */
            &:has(> :global(.cs-toast-description)) {
                align-items: start;

                &:has(> :global(.cs-toast-close)) {
                    grid-template-columns: minmax(0, 1fr) auto;
                }

                &:has(> :global(.cs-toast-icon)):has(> :global(.cs-toast-close)) {
                    grid-template-columns: 18px minmax(0, 1fr) auto;
                }

                > :global(.cs-toast-description) {
                    grid-row: 2;
                }

                > :global(.cs-toast-action) {
                    grid-column: 1;
                    grid-row: 3;
                    justify-self: start;
                    margin-block-start: 8px;
                }

                &:has(> :global(.cs-toast-icon)) > :global(.cs-toast-action) {
                    grid-column: 2;
                }

                > :global(.cs-toast-close) {
                    margin-block-start: -2px;
                    margin-inline-end: -4px;
                }
            }
        }
    }
</style>
