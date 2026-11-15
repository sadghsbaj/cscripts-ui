<script lang="ts">
    import { createControlGroup } from "../../shared/control-group/index.ts";
    import { setCheckboxGroupContext } from "./checkbox-group.context.ts";
    import { type CheckboxGroupProps } from ".";

    let {
        ref = $bindable(null),
        value = $bindable(),
        onValueChange,
        name,
        disabled = false,
        invalid = false,
        class: className,
        children,
        ...rest
    }: CheckboxGroupProps = $props();

    setCheckboxGroupContext(
        createControlGroup({
            value: () => value,
            setValue: (next) => {
                value = next;
            },
            onValueChange: (next) => onValueChange?.(next),
            name: () => name,
            disabled: () => disabled,
            invalid: () => invalid,
        }),
    );
</script>

<div
    bind:this={ref}
    role="group"
    {...rest}
    aria-disabled={disabled ? "true" : undefined}
    class={["cs-checkbox-group", className]}
    data-disabled={disabled ? "" : undefined}
    data-invalid={invalid ? "" : undefined}
>
    {@render children?.()}
</div>
