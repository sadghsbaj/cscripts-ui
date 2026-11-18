<script lang="ts" generics="T extends string = string">
    import { setDropdownRadioGroupContext } from "./dropdown.context.internal.ts";
    import type { DropdownRadioGroupProps } from "./index.ts";

    let {
        ref = $bindable(null),
        value = $bindable(),
        onValueChange,
        class: className,
        children,
        ...rest
    }: DropdownRadioGroupProps<T> = $props();

    setDropdownRadioGroupContext<T>({
        get value() {
            return value;
        },
        selectValue(nextValue: T): void {
            if (value === nextValue) return;
            value = nextValue;
            onValueChange?.(nextValue);
        },
    });
</script>

<div
    bind:this={ref}
    {...rest}
    role="group"
    class={["cs-dropdown-radio-group", "cs-listbox-group", className]}
>
    {@render children?.()}
</div>
