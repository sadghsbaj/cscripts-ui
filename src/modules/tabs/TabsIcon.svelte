<script lang="ts">
    import type { TabsIconProps } from "./tabs.types.ts";

    let { icon: Icon, class: className, ...rest }: TabsIconProps = $props();
</script>

<Icon {...rest} aria-hidden="true" class={["cs-tabs-icon", className]} />
