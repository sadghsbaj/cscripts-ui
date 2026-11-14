<!--
@component
Composite container (`<ToggleButtonGroup />`) grouping multiple `<ToggleButton />` instances into
a cohesive segmented or clustered control bar with coordinated corner radii and physics.
-->
<script lang="ts">
    import "../../css/shared/button-group.css";
    import { setToggleButtonGroupContext, type ToggleButtonGroupProps } from "./index.ts";

    let {
        ref = $bindable(null),
        type,
        value = $bindable(),
        allowDeselect = false,
        orientation = "horizontal",
        class: className,
        children,
        ...rest
    }: ToggleButtonGroupProps = $props();

    setToggleButtonGroupContext({
        isSelected(itemValue: string | undefined): boolean {
            if (itemValue === undefined) return false;
            if (type === "single") {
                return value === itemValue;
            }
            return Array.isArray(value) && value.includes(itemValue);
        },
        toggle(itemValue: string | undefined): void {
            if (itemValue === undefined) return;

            if (type === "single") {
                if (value === itemValue) {
                    if (allowDeselect) {
                        value = undefined;
                    }
                    return;
                }
                value = itemValue;
                return;
            }

            const current = Array.isArray(value) ? value : [];
            value = current.includes(itemValue) ? current.filter((v) => v !== itemValue) : [...current, itemValue];
        },
    });
</script>

<div
    bind:this={ref}
    role="group"
    {...rest}
    class={["cs-toggle-button-group", "cs-button-control-group", className]}
    data-type={type}
    data-orientation={orientation}
    data-fixed-selection={type === "single" && !allowDeselect ? "" : undefined}
>
    {@render children?.()}
</div>

<style>
    @layer components.composite {
        .cs-toggle-button-group {
            --cs-button-control-group-inner-radius: var(--cs-toggle-button-group-inner-radius, var(--cs-radius-none));

            /* In fixed single-selection mode (segmented control), clicking the already-active
             * item is a no-op. Neutralizing press squash prevents confusing interactivity cues. */
            &[data-fixed-selection] > :global(.cs-toggle-button[aria-pressed="true"]) {
                --cs-button-control-squash-active: 1;
                --cs-button-control-focus-scale-active: 1;
            }
        }
    }
</style>
