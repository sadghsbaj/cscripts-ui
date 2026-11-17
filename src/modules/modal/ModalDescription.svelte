<script lang="ts">
    import { getModalContext, hasModalContext, type ModalDescriptionProps } from "./index.ts";

    let {
        ref = $bindable(null),
        id,
        class: className,
        children,
        ...rest
    }: ModalDescriptionProps = $props();

    const generatedId = $props.id();
    const resolvedId = $derived(id ?? generatedId);
    const modal = hasModalContext() ? getModalContext() : undefined;

    $effect(() => {
        if (!modal) return;
        return modal.registerDescription(resolvedId);
    });
</script>

<p bind:this={ref} id={resolvedId} {...rest} class={["cs-modal-description", className]}>
    {@render children?.()}
</p>

<style>
    @layer components.composite {
        .cs-modal-description {
            margin: 0;
            min-inline-size: 0;
            color: var(--cs-color-text-weak);
            font-size: var(--cs-text-sm);
            line-height: var(--cs-leading-normal);
        }
    }
</style>
