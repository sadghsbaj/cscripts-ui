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
        }
    }
</style>
