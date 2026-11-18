<script lang="ts">
    import type { ComboboxIconProps } from "./index.ts";

    let { icon: Icon, color, class: className, ...rest }: ComboboxIconProps = $props();
</script>

<Icon {...rest} {color} aria-hidden="true" class={["cs-combobox-icon", className]} />

<style>
    @layer components.composite {
        :global(.cs-combobox-icon) {
            flex-shrink: 0;
            width: var(--cs-combobox-icon-size, 16px);
            height: var(--cs-combobox-icon-size, 16px);
            color: var(--cs-combobox-icon-fg, var(--cs-color-text-weak));
            stroke-width: 2.25;
            pointer-events: none;
            transition: color var(--cs-dur-effect) var(--cs-ease-effect);
        }
    }
</style>
