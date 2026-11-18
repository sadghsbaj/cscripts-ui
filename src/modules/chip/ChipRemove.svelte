<script lang="ts">
    import "./chip.internal.css";

    import { X } from "@lucide/svelte";

    import { t } from "../../shared/lang.internal.ts";
    import { getChipContext, hasChipContext, hasChipTriggerContext } from "./chip.context.internal.ts";
    import type { ChipRemoveProps } from "./index.ts";

    let { ref = $bindable(null), disabled = false, class: className, children, ...rest }: ChipRemoveProps = $props();

    const chip = hasChipContext() ? getChipContext() : undefined;
    const isRemoveDisabled = $derived(Boolean(disabled || chip?.disabled));

    $effect.pre(() => {
        if (hasChipTriggerContext()) {
            throw new Error(
                "<ChipRemove> must be a sibling of <ChipTrigger> inside <Chip>, not nested inside <ChipTrigger>."
            );
        }

        return chip?.registerRemove();
    });

    const defaultAriaLabel = $derived(
        rest["aria-label"] === undefined && rest["aria-labelledby"] === undefined
            ? t({ de: "Entfernen", en: "Remove" })
            : undefined
    );
</script>

<button
    bind:this={ref}
    aria-label={defaultAriaLabel}
    {...rest}
    type="button"
    disabled={isRemoveDisabled || undefined}
    data-disabled={isRemoveDisabled ? "" : undefined}
    class={["cs-chip-remove", className]}
>
    {#if children}
        {@render children()}
    {:else}
        <X strokeWidth={2.5} aria-hidden="true" class="cs-chip-remove-icon" />
    {/if}
</button>
