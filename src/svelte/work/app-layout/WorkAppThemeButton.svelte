<!--
@component
Pre-configured theme toggle button (`<WorkAppThemeButton />`) for internal work tools.

Architectural Notes:
- Sizing: Perfectly sized for `<WorkAppHeader>` and `<WorkAppHeaderSegment>` (48px pill matching identity and brand badges).
- Automated Reactive State: Cycles through theme modes on click (`theme.cycle()`) and renders the matching mode icon (`theme.icon`).
-->
<script lang="ts">
    import { Button, ButtonIcon } from "../../components/button/index.ts";
    import { HitArea } from "../../components/hit-area/index.ts";
    import { theme } from "../../theme.svelte.ts";
    import type { WorkAppThemeButtonProps } from "./index.ts";

    let {
        "aria-label": ariaLabel = "Theme wechseln",
        class: className,
        onclick,
        ...rest
    }: WorkAppThemeButtonProps = $props();
</script>

<Button
    {...rest}
    size="xl"
    variant="elevated"
    iconOnly
    aria-label={ariaLabel}
    onclick={(event) => {
        onclick?.(event);
        if (!event.defaultPrevented) {
            theme.cycle();
        }
    }}
    class={["cs-work-app-theme-button", className]}
>
    <ButtonIcon icon={theme.icon} />
    <HitArea size="md" />
</Button>

<style>
    @layer components.composite {
        :global(.cs-work-app-theme-button) {
            --_height: 48px;
            width: 48px;
            height: 48px;
        }
    }
</style>
