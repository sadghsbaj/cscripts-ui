<!--
@component
Accessible icon wrapper (`<ButtonIcon icon={...} />`) for `<Button />` components.

Architectural Notes:
- Accessibility: Automatically enforces `aria-hidden="true"` so decorative button
  icons never pollute screen reader announcements.
- Optical Sizing: Automatically sizes icons to `font-size + 2px` (`calc(1em + 2px)`)
  for text buttons—or `50%` via `--_icon-size` on `iconOnly` buttons—and matches
  `stroke-width: 2.5` to the `600` button font weight.
-->
<script lang="ts">
    import type { ButtonIconProps } from "./index.ts";

    let { icon: Icon, class: className, ...rest }: ButtonIconProps = $props();
</script>

<Icon {...rest} aria-hidden="true" class={["cs-button-icon", className]} />

<style>
    @layer components {
        :global(.cs-button-icon) {
            flex-shrink: 0;
            width: var(--_icon-size, calc(1em + 2px));
            height: var(--_icon-size, calc(1em + 2px));
            stroke-width: 2.5;
            pointer-events: none;
        }
    }
</style>
