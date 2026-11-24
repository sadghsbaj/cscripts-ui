<script lang="ts">
    import { Search } from "@lucide/svelte";

    import type { CommandPaletteIconProps } from "./index.ts";

    let { icon: Icon = Search, color, class: className, ...rest }: CommandPaletteIconProps = $props();
</script>

<Icon {...rest} {color} aria-hidden="true" class={["cs-command-palette-icon", className]} />
