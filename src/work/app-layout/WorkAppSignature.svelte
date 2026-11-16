<script lang="ts">
    import { Info } from "@lucide/svelte";

    import { HitArea } from "../../modules/hit-area/index.ts";
    import { tooltip } from "../../modules/tooltip/tooltip.attach.svelte.ts";
    import { t } from "../../shared/lang.internal.ts";
    import type { WorkAppSignatureProps } from "./index.ts";

    let {
        text = t({ de: "Entwickelt von Colin Schäfer", en: "Developed by Colin Schäfer" }),
        class: className,
        ...rest
    }: WorkAppSignatureProps = $props();

    // Attach directly on the element so clicks are stopped before bubbling to ancestors
    // (Svelte 5 delegated `onclick` runs at the root, after ancestor listeners).
    function stopClick(event: MouseEvent): void {
        event.preventDefault();
        event.stopPropagation();
    }

    function blockClicks(node: HTMLElement): () => void {
        node.addEventListener("click", stopClick);
        return () => node.removeEventListener("click", stopClick);
    }
</script>

<button
    {...rest}
    type="button"
    aria-label={text}
    class={["cs-work-app-signature", className]}
    {@attach blockClicks}
    {@attach tooltip({ text, placement: "left" })}
>
    <Info aria-hidden="true" class="cs-work-app-signature-icon" />
    <HitArea size="md" />
</button>

<style>
    @layer components.primitive {
        .cs-work-app-signature {
            position: fixed;
            right: 24px;
            bottom: 24px;
            z-index: 10;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            aspect-ratio: 1;
            width: 28px;
            height: 28px;
            padding: 0;
            color: var(--cs-color-base-soft-fg);
            background-color: transparent;
            border: none;
            border-radius: 14px;
            corner-shape: var(--cs-squircle-soft);
            opacity: 0.6;
            user-select: none;
            transition:
                opacity var(--cs-dur-effect) var(--cs-ease-effect),
                color var(--cs-dur-effect) var(--cs-ease-effect),
                background-color var(--cs-dur-effect) var(--cs-ease-effect);
            cursor: default;

            @media (hover: hover) {
                &:hover {
                    color: var(--cs-color-base-soft-fg-hover);
                    background-color: var(--cs-color-base-soft);
                    opacity: 1;
                }
            }

            &:focus-visible {
                color: var(--cs-color-base-soft-fg-hover);
                background-color: var(--cs-color-base-soft);
                opacity: 1;
            }

            @media (width < 640px) {
                display: none;
            }
        }

        :global(.cs-work-app-signature-icon) {
            flex-shrink: 0;
            width: 14px;
            height: 14px;
            stroke-width: 2.5;
            pointer-events: none;
        }
    }
</style>
