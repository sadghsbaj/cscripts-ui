<!--
@component
Pre-configured help and documentation trigger button (`<WorkAppHelpButton />`) for internal work tools.

Architectural Notes:
- Sizing: Perfectly sized for `<WorkAppHeader>` and `<WorkAppHeaderSegment>` (48px pill matching identity and brand badges).
- Neutral Action: Delegates interaction to `onclick` so the consuming application can open an in-app manual modal, drawer, or external documentation link.
-->
<script lang="ts">
    import { BookOpen } from "@lucide/svelte";

    import { Button, ButtonIcon } from "../../components/button/index.ts";
    import { HitArea } from "../../components/hit-area/index.ts";
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
>
    <ButtonIcon {icon} />
    <HitArea size="md" />
</Button>

<style>
    @layer components.composite {
        :global(.cs-work-app-help-button) {
            --_height: 48px;
            width: 48px;
            height: 48px;
            corner-shape: var(--cs-suqircle-smooth);
        }
    }
</style>
