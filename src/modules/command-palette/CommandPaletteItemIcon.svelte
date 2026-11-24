<script lang="ts">
    import type { CommandPaletteItemIconProps } from "./index.ts";

    let { icon: Icon, color, class: className, ...rest }: CommandPaletteItemIconProps = $props();
</script>

<Icon {...rest} {color} aria-hidden="true" class={["cs-command-palette-item-icon", "cs-listbox-item-icon", className]} />
