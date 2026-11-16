<script lang="ts">
    import { Button, ButtonIcon } from "../../modules/button/index.ts";
    import { HitArea } from "../../modules/hit-area/index.ts";
    import { tooltip } from "../../modules/tooltip/tooltip.attach.svelte.ts";
    import { theme, THEME_LABELS } from "../../modules/theme/index.ts";
    import { t } from "../../shared/lang.internal.ts";
    import type { WorkAppThemeButtonProps } from "./index.ts";

    let {
        "aria-label": ariaLabel = t({ de: "Theme wechseln", en: "Switch theme" }),
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
    {@attach tooltip({
        text: t({ de: `Erscheinung: ${THEME_LABELS[theme.mode]}`, en: `Appearance: ${THEME_LABELS[theme.mode]}` }),
        placement: "bottom",
    })}
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
