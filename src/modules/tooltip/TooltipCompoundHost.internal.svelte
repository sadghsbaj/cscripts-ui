<script lang="ts">
    import { Kbd, KbdGroup, KbdSeparator } from "../kbd";
    import Tooltip from "./Tooltip.svelte";
    import TooltipText from "./TooltipText.svelte";

    let { id = "tip-compound" }: { id?: string } = $props();
</script>

<Tooltip {id}>
    <TooltipText>Copy</TooltipText>
    <KbdGroup variant="soft" size="sm">
        <Kbd symbol="ctrl" />
        <KbdSeparator />
        <Kbd>C</Kbd>
    </KbdGroup>
</Tooltip>
