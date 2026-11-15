<script lang="ts">
    import { BookOpen } from "@lucide/svelte";

    import { Button, ButtonIcon } from "../../modules/button/index.ts";
    import { HitArea } from "../../modules/hit-area/index.ts";
    import { tooltip } from "../../modules/tooltip/tooltip.attach.svelte.ts";
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
