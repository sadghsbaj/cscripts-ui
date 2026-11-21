<script lang="ts" generics="T extends string = string">
    import { setContextMenuRadioGroupContext } from "./context-menu.context.internal.ts";
    import type { ContextMenuRadioGroupProps } from "./index.ts";

    let {
        ref = $bindable(null),
        value = $bindable(),
        onValueChange,
        class: className,
        children,
        ...rest
    }: ContextMenuRadioGroupProps<T> = $props();

    setContextMenuRadioGroupContext<T>({
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
    class={["cs-context-menu-radio-group", "cs-listbox-group", className]}
>
    {@render children?.()}
</div>
