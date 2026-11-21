<script lang="ts">
    import type { ContextMenuItemIconProps } from "./index.ts";

    let { icon: Icon, color, class: className, ...rest }: ContextMenuItemIconProps = $props();
</script>

<Icon {...rest} {color} aria-hidden="true" class={["cs-context-menu-item-icon", "cs-listbox-item-icon", className]} />
