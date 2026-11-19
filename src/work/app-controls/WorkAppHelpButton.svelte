<script lang="ts">
    import { BookOpen, X } from "@lucide/svelte";

    import { Button, ButtonIcon } from "../../modules/button/index.ts";
    import { HitArea } from "../../modules/hit-area/index.ts";
    import { tooltip } from "../../modules/tooltip/tooltip.attach.svelte.ts";
    import { t } from "../../shared/lang.internal.ts";
    import type { WorkAppHelpButtonProps } from "./index.ts";

    let {
        "aria-label": ariaLabel = t({ de: "Dokumentation und Hilfe", en: "Documentation and help" }),
        icon = BookOpen,
        pressed = $bindable(),
        onPressedChange,
        onclick,
        class: className,
        ...rest
    }: WorkAppHelpButtonProps = $props();

    const resolvedIcon = $derived(pressed ? X : icon);

    function handleClick(event: MouseEvent & { currentTarget: EventTarget & HTMLButtonElement }): void {
        onclick?.(event);
        if (pressed !== undefined && !event.defaultPrevented) {
            const next = !pressed;
            pressed = next;
            onPressedChange?.(next);
        }
    }
</script>

<Button
    {...rest}
    size="xl"
    variant="elevated"
    iconOnly
    aria-label={ariaLabel}
    aria-pressed={pressed}
    data-pressed={pressed ? "" : undefined}
    onclick={handleClick}
    class={["cs-work-app-help-button", className]}
    {@attach tooltip({
        text: t(pressed ? { de: "Hilfe schließen", en: "Close help" } : { de: "Hilfe", en: "Help" }),
        placement: "bottom",
    })}
>
    <ButtonIcon icon={resolvedIcon} />
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
