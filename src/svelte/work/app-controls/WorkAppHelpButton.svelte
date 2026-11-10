<!--
@component
Pre-configured help and documentation trigger button (`<WorkAppHelpButton />`) for internal work tools.

Architectural Notes:
- Sizing: Perfectly sized for `<WorkAppHeader>` and `<WorkAppHeaderSegment>` (48px pill matching identity and brand badges).
- Neutral Action: Delegates interaction to `onclick` so the consuming application can open an in-app manual modal, drawer, or external documentation link.
-->
<script lang="ts">
    import { BookOpen } from "@lucide/svelte";

    import { Button, ButtonIcon } from "../../primitives/button/index.ts";
    import { HitArea } from "../../primitives/hit-area/index.ts";
    import { tooltip } from "../../primitives/tooltip/tooltip.attach.svelte.ts";
    import type { WorkAppHelpButtonProps } from "./index.ts";

    let {
        "aria-label": ariaLabel = "Dokumentation und Hilfe",
        icon = BookOpen,
        class: className,
        ...rest
    }: WorkAppHelpButtonProps = $props();
</script>

<Button
    {...rest}
    size="xl"
    variant="elevated"
    iconOnly
    aria-label={ariaLabel}
    class={["cs-work-app-help-button", className]}
    {@attach tooltip({ text: "Hilfe", placement: "bottom" })}
>
    <ButtonIcon {icon} />
    <HitArea size="md" />
</Button>

<style>
    @layer components.composite {
        :global(.cs-work-app-help-button) {
            width: 48px;
            height: 48px;
        }
    }
</style>
