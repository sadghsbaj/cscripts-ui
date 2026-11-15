<script lang="ts">
    import { Checkbox } from "../checkbox/index.ts";
    import { getCheckboxGroupContext, hasCheckboxGroupContext } from "./checkbox-group.context.ts";
    import { type CheckboxGroupSelectAllProps } from ".";

    let {
        ref = $bindable(null),
        variant,
        size,
        disabled,
        invalid,
        class: className,
        onchange,
        ...rest
    }: CheckboxGroupSelectAllProps = $props();

    const group = hasCheckboxGroupContext() ? getCheckboxGroupContext() : undefined;

    function handleSelectAllChange(event: Event & { currentTarget: EventTarget & HTMLInputElement }): void {
        if (group) {
            group.toggleAll();
            // Sync native input properties before Checkbox's handleChange reads them,
            // preventing Chromium's click-indeterminate reset from causing a 1-frame flash.
            event.currentTarget.checked = group.isAllSelected;
            event.currentTarget.indeterminate = group.isIndeterminate;
        }
        onchange?.(event);
    }
</script>

<Checkbox
    bind:ref
    {variant}
    {size}
    {...rest}
    class={["cs-checkbox-group-select-all", className]}
    checked={group ? group.isAllSelected : false}
    indeterminate={group ? group.isIndeterminate : false}
    disabled={Boolean(disabled || group?.disabled)}
    invalid={invalid ?? group?.invalid}
    onchange={handleSelectAllChange}
/>
