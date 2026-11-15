<script lang="ts">
    import { HitArea } from "../hit-area/index.ts";
    import { getTextInputContext, hasTextInputContext, type TextInputActionProps } from "./index.ts";

    let {
        ref = $bindable(null),
        icon: Icon,
        visible = true,
        disabled,
        class: className,
        children,
        ...rest
    }: TextInputActionProps = $props();

    const ctx = hasTextInputContext() ? getTextInputContext() : undefined;
    const resolvedDisabled = $derived(Boolean(disabled || ctx?.disabled));
</script>

<button
    bind:this={ref}
    {...rest}
    type="button"
    class={["cs-text-input-action", className]}
    disabled={resolvedDisabled}
    data-visible={visible ? "" : "false"}
    aria-hidden={visible ? undefined : "true"}
    tabindex={visible ? rest.tabindex : -1}
>
    <HitArea size="sm" />
    {#if Icon}
        <Icon aria-hidden="true" class="cs-text-input-action-icon" />
    {/if}
    {@render children?.()}
</button>

<style>
    @layer components.primitive {
        .cs-text-input-action {
            isolation: isolate;
            position: relative;
            flex-shrink: 0;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: var(--cs-text-input-action-size, 28px);
            height: var(--cs-text-input-action-size, 28px);
            padding: 0;
            margin: 0;
            margin-inline: 0;
            border: none;
            background-color: transparent;
            color: var(--cs-color-text-weak);
            font-size: inherit;
            line-height: 1;
            border-radius: calc(var(--cs-text-input-action-size, 28px) / 2);
            corner-shape: var(--cs-squircle-soft);
            overflow: visible;
            cursor: default;
            opacity: 1;
            scale: 1;
            visibility: visible;
            will-change: opacity, scale;
            transition:
                color var(--cs-dur-effect) var(--cs-ease-effect),
                width var(--cs-dur-120) var(--cs-ease-quart-out),
                margin-inline var(--cs-dur-120) var(--cs-ease-quart-out),
                opacity var(--cs-dur-120) var(--cs-ease-quart-out),
                scale var(--cs-dur-120) var(--cs-ease-quart-out),
                visibility var(--cs-dur-120) allow-discrete;

            &::before {
                content: "";
                position: absolute;
                inset: 0;
                z-index: -1;
                border-radius: inherit;
                corner-shape: inherit;
                background-color: transparent;
                scale: 1;
                transition:
                    background-color var(--cs-dur-effect) var(--cs-ease-effect),
                    scale var(--cs-dur-120) var(--cs-ease-quart-out);
            }

            &[data-visible="false"] {
                width: 0;
                margin-inline-end: calc(var(--cs-text-input-gap, 8px) * -1);
                opacity: 0;
                scale: 0.85;
                visibility: hidden;
                pointer-events: none;
            }

            :global(.cs-text-input-action:not([data-visible="false"])) + &:not([data-visible="false"]) {
                margin-inline-start: calc(var(--cs-text-input-gap, 8px) * -0.5);
            }

            :global(.cs-text-input-field) ~ &[data-visible="false"] {
                margin-inline-start: calc(var(--cs-text-input-gap, 8px) * -1);
                margin-inline-end: 0;
            }

            @media (hover: hover) {
                &:hover:not(:disabled) {
                    color: var(--cs-color-text-strong);

                    &::before {
                        background-color: var(--cs-color-base-soft);
                    }
                }
            }

            &:active:not(:disabled)::before {
                background-color: var(--cs-color-base-soft-hover);
                scale: 0.92;
                transition:
                    background-color var(--cs-dur-press) var(--cs-ease-press),
                    scale var(--cs-dur-press) var(--cs-ease-press);
            }

            &:focus-visible {
                outline: 2px solid var(--cs-color-accent-solid);
                outline-offset: 0;
            }

            &:disabled {
                --cs-disabled-opacity: 1;
                color: var(--cs-color-disabled-fg);
            }

            > :global(.cs-text-input-action-icon) {
                pointer-events: none;
            }

            > :global(svg.cs-text-input-action-icon) {
                width: var(--cs-text-input-icon-size, 16px);
                height: var(--cs-text-input-icon-size, 16px);
            }
        }
    }
</style>
