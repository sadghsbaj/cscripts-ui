<script lang="ts">
    import { Collapsible } from "../collapsible/index.ts";
    import { getAccordionContext, getAccordionItemContext } from "./accordion-context.internal.ts";
    import type { AccordionContentProps } from "./index.ts";

    let {
        ref = $bindable<HTMLDivElement | null>(null),
        padded = true,
        region = true,
        keepMounted,
        motion,
        animate,
        class: className,
        children,
        ...rest
    }: AccordionContentProps = $props();

    const root = getAccordionContext();
    const item = getAccordionItemContext();

    const effectiveKeepMounted = $derived(keepMounted ?? root.keepMounted);
    const effectiveMotion = $derived(motion ?? root.motion);
    const effectiveAnimate = $derived(animate ?? root.animate);
</script>

<Collapsible
    bind:ref
    {...rest}
    id={item.contentId}
    open={item.open}
    keepMounted={effectiveKeepMounted}
    motion={effectiveMotion}
    animate={effectiveAnimate}
    disabled={item.disabled}
    role={region ? "region" : undefined}
    aria-labelledby={region ? item.triggerId : undefined}
    class={["cs-accordion-content", className]}
>
    <div class="cs-accordion-content-body" data-flush={padded ? undefined : ""}>
        {@render children?.()}
    </div>
</Collapsible>

<style>
    @layer components.composite {
        .cs-accordion-content-body {
            --cs-accordion-content-px: var(--cs-accordion-px);

            padding: var(--cs-accordion-content-pt) var(--cs-accordion-content-px)
                var(--cs-accordion-content-pb);
            color: var(--cs-accordion-content-fg);
            font-size: var(--cs-accordion-content-size);
            line-height: var(--cs-leading-normal);

            &[data-flush] {
                --cs-accordion-content-px: 0px;
                --cs-accordion-content-pt: 0px;
                --cs-accordion-content-pb: 0px;
            }
        }
    }
</style>
