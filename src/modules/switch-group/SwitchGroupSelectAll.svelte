<script lang="ts">
    import { Switch } from "../switch/index.ts";
    import { getSwitchGroupContext, hasSwitchGroupContext } from "./switch-group.context.ts";
    import { type SwitchGroupSelectAllProps } from ".";

    let {
        ref = $bindable(null),
        size,
        disabled,
        class: className,
        onchange,
        ...rest
    }: SwitchGroupSelectAllProps = $props();

    const group = hasSwitchGroupContext() ? getSwitchGroupContext() : undefined;

    function handleSelectAllChange(event: Event & { currentTarget: EventTarget & HTMLInputElement }): void {
        if (group) {
            group.toggleAll();
            // Sync native input state before Switch's handleChange reads it so controlled groups stay aligned.
            event.currentTarget.checked = group.isAllSelected;
        }
        onchange?.(event);
    }
</script>

<Switch
    bind:ref
    {size}
    {...rest}
    class={["cs-switch-group-select-all", className]}
    bind:checked={() => (group ? group.isAllSelected : false), () => {}}
    disabled={Boolean(disabled || group?.disabled)}
    onchange={handleSelectAllChange}
/>
