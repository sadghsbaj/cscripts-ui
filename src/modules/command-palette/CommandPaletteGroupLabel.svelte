<script lang="ts">
    import {
        getCommandPaletteGroupContext,
        hasCommandPaletteGroupContext,
    } from "./command-palette.context.internal.ts";
    import type { CommandPaletteGroupLabelProps } from "./index.ts";

    let { ref = $bindable(null), id, class: className, children, ...rest }: CommandPaletteGroupLabelProps = $props();

    const group = hasCommandPaletteGroupContext() ? getCommandPaletteGroupContext() : undefined;
    const generatedId = $props.id();
    const resolvedId = $derived(id ?? generatedId);

    $effect(() => {
        if (!group) return;
        const element = ref;
        const id = resolvedId;
        const readText = (): string | undefined => element?.textContent?.trim() || undefined;

        const unregister = group.registerLabel(id, readText());
        if (!element || typeof MutationObserver === "undefined") {
            return unregister;
        }

        const observer = new MutationObserver(() => {
            group.registerLabel(id, readText());
        });
        observer.observe(element, { childList: true, characterData: true, subtree: true });

        return () => {
            observer.disconnect();
            unregister();
        };
    });
</script>

<div
    bind:this={ref}
    {...rest}
    id={resolvedId}
    role="presentation"
    class={["cs-command-palette-group-label", "cs-listbox-group-label", className]}
>
    {@render children?.()}
</div>
