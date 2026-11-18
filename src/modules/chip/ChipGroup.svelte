<script lang="ts">
    import { setChipGroupContext } from "./chip.context.internal.ts";
    import type { ChipGroupProps } from "./index.ts";

    let {
        ref = $bindable(null),
        variant,
        size,
        disabled = false,
        wrap = true,
        multiple = false,
        value = $bindable(),
        onValueChange,
        class: className,
        children,
        ...rest
    }: ChipGroupProps = $props();

    setChipGroupContext({
        get variant() {
            return variant;
        },
        get size() {
            return size;
        },
        get disabled() {
            return Boolean(disabled);
        },
        isSelected(itemValue: string): boolean {
            if (multiple) {
                return Array.isArray(value) && value.includes(itemValue);
            }
            return value === itemValue;
        },
        toggle(itemValue: string): void {
            if (disabled) return;

            if (multiple) {
                const current = Array.isArray(value) ? value : [];
                const next = current.includes(itemValue)
                    ? current.filter((v) => v !== itemValue)
                    : [...current, itemValue];
                value = next;
                (onValueChange as ((next: string[]) => void) | undefined)?.(next);
                return;
            }

            const next = value === itemValue ? undefined : itemValue;
            value = next;
            (onValueChange as ((next: string | undefined) => void) | undefined)?.(next);
        },
    });
</script>

<div
    bind:this={ref}
    role="group"
    {...rest}
    aria-disabled={disabled ? "true" : undefined}
    class={["cs-chip-group", className]}
    data-variant={variant}
    data-size={size}
    data-wrap={wrap ? "" : undefined}
    data-disabled={disabled ? "" : undefined}
>
    {@render children?.()}
</div>

<style>
    @layer components.primitive {
        .cs-chip-group {
            --cs-chip-group-gap: 6px;

            display: flex;
            flex-wrap: nowrap;
            gap: var(--cs-chip-group-gap);
            align-items: center;

            &[data-wrap] {
                flex-wrap: wrap;
            }

            &[data-size="xs"] {
                --cs-chip-group-gap: 4px;
            }

            &[data-size="sm"],
            &[data-size="md"] {
                --cs-chip-group-gap: 6px;
            }

            &[data-size="lg"],
            &[data-size="xl"] {
                --cs-chip-group-gap: 8px;
            }

            &[data-disabled] {
                --cs-disabled-opacity: 1;
            }
        }
    }
</style>
