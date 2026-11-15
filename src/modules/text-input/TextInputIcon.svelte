<script lang="ts">
    import type { TextInputIconProps } from "./index.ts";

    let { icon: Icon, class: className, ...rest }: TextInputIconProps = $props();
</script>

<Icon {...rest} aria-hidden="true" class={["cs-text-input-icon", className]} />

<style>
    @layer components.primitive {
        :global(.cs-text-input-icon) {
            flex-shrink: 0;
            width: var(--cs-text-input-icon-size, 16px);
            height: var(--cs-text-input-icon-size, 16px);
            color: var(--cs-text-input-icon-fg, var(--cs-color-text-weak));
            pointer-events: none;
            transition: color var(--cs-dur-effect) var(--cs-ease-effect);
        }
    }
</style>
