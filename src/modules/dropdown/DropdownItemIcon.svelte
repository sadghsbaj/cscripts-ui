<script lang="ts">
    import type { DropdownItemIconProps } from "./index.ts";

    let { icon: Icon, color, class: className, ...rest }: DropdownItemIconProps = $props();
</script>

<Icon {...rest} {color} aria-hidden="true" class={["cs-dropdown-item-icon", "cs-listbox-item-icon", className]} />
