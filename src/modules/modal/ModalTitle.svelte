<script lang="ts">
    import { getModalContext, hasModalContext, type ModalTitleProps } from "./index.ts";

    let {
        ref = $bindable(null),
        as = "h2",
        id,
        class: className,
        children,
        ...rest
    }: ModalTitleProps = $props();

    const generatedId = $props.id();
    const resolvedId = $derived(id ?? generatedId);
    const modal = hasModalContext() ? getModalContext() : undefined;

    $effect(() => {
        if (!modal) return;
        return modal.registerTitle(resolvedId);
    });
</script>

<svelte:element this={as} bind:this={ref} id={resolvedId} {...rest} class={["cs-modal-title", className]}>
    {@render children?.()}
</svelte:element>

<style>
    @layer components.composite {
        .cs-modal-title {
            margin: 0;
            min-inline-size: 0;
            color: var(--cs-color-text-strong);
            font-size: var(--cs-modal-title-size, var(--cs-text-lg));
            font-weight: 600;
            line-height: var(--cs-leading-tight);
            letter-spacing: var(--cs-tracking-tight);
        }
    }
</style>
