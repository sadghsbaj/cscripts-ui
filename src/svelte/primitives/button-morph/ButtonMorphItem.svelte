<!--
@component
State slot wrapper (`<ButtonMorphItem value="..." />`) inside `<ButtonMorph />` holding a
`<Button />`, `<ToggleButton />`, or `<CloseButton />` for a specific morph state.

Architectural Notes:
- Accessibility & Inert Isolation: Automatically applies native `inert` and `aria-hidden="true"`
  whenever the slot is not the active state, ensuring only the active button participates in the
  tab order and accessibility tree.
- Intrinsic Measurement: Registers the slot in DOM order and observes its child button's natural
  dimensions via `ResizeObserver` so target sizes are pre-cached before a morph begins.
-->
<script lang="ts">
    import { getButtonMorphContext, type ButtonMorphItemProps } from "./index.ts";

    let { value, class: className, children, ...rest }: ButtonMorphItemProps = $props();

    const morph = getButtonMorphContext();
    const state = $derived(morph.getItemState(value));
    const isActive = $derived(state === "active");
</script>

<div
    {...rest}
    {@attach morph.attachItem(value)}
    class={["cs-button-morph-item", className]}
    data-value={value}
    data-state={state}
    inert={!isActive}
    aria-hidden={!isActive ? "true" : undefined}
>
    {@render children?.()}
</div>
