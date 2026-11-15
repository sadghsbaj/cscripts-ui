<script lang="ts">
    import { createControlGroup } from "../../shared/control-group/index.ts";
    import { setSwitchGroupContext } from "./switch-group.context.ts";
    import { type SwitchGroupProps } from ".";

    let {
        ref = $bindable(null),
        value = $bindable(),
        onValueChange,
        name,
        disabled = false,
        class: className,
        children,
        ...rest
    }: SwitchGroupProps = $props();

    setSwitchGroupContext(
        createControlGroup({
            value: () => value,
            setValue: (next) => {
                value = next;
            },
            onValueChange: (next) => onValueChange?.(next),
            name: () => name,
            disabled: () => disabled,
        }),
    );
</script>

<div
    bind:this={ref}
    role="group"
    {...rest}
    aria-disabled={disabled ? "true" : undefined}
    class={["cs-switch-group", className]}
    data-disabled={disabled ? "" : undefined}
>
    {@render children?.()}
</div>
