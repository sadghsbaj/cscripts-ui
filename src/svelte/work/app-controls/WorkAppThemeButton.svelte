<!--
@component
Pre-configured theme toggle button (`<WorkAppThemeButton />`) for internal work tools.

Architectural Notes:
- Sizing: Perfectly sized for `<WorkAppHeader>` and `<WorkAppHeaderSegment>` (48px pill matching identity and brand badges).
- Automated Reactive State: Cycles through theme modes on click (`theme.cycle()`) and renders the matching mode icon (`theme.icon`).
-->
<script lang="ts">
    import { Button, ButtonIcon } from "../../primitives/button/index.ts";
    import { HitArea } from "../../primitives/hit-area/index.ts";
    import { tooltip } from "../../primitives/tooltip/tooltip.attach.svelte.ts";
    import { GERMAN_THEME_LABELS, theme } from "../../theme.svelte.ts";
    import type { WorkAppThemeButtonProps } from "./index.ts";

    let {
        "aria-label": ariaLabel = "Theme wechseln",
        class: className,
        onclick,
        ...rest
    }: WorkAppThemeButtonProps = $props();

    function handleClick(event: MouseEvent & { currentTarget: EventTarget & HTMLButtonElement }): void {
        onclick?.(event);
        if (!event.defaultPrevented) {
            theme.cycle();
        }
    }
</script>

<Button
    {...rest}
    size="xl"
    variant="elevated"
    iconOnly
    aria-label={ariaLabel}
    onclick={handleClick}
    class={["cs-work-app-theme-button", className]}
    {@attach tooltip({ text: `Erscheinung: ${GERMAN_THEME_LABELS[theme.mode]}`, placement: "bottom" })}
>
    <ButtonIcon icon={theme.icon} />
    <HitArea size="md" />
</Button>

<style>
    @layer components.composite {
        :global(.cs-work-app-theme-button) {
            width: 48px;
            height: 48px;
        }
    }
</style>
