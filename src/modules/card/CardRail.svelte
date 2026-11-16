<script lang="ts">
    import type { CardRailProps } from "./index.ts";

    let {
        ref = $bindable(null),
        variant,
        placement = "end",
        columns = 1,
        class: className,
        children,
        ...rest
    }: CardRailProps = $props();
</script>

<div
    bind:this={ref}
    {...rest}
    class={["cs-card-rail", className]}
    data-variant={variant}
    data-placement={placement}
    data-columns={columns}
>
    {@render children?.()}
</div>

<style>
    @layer components.composite {
        .cs-card-rail {
            display: grid;
            gap: var(--cs-card-rail-gap, 6px);
            align-content: start;
            align-items: center;
            align-self: stretch;
            justify-items: center;
            padding: var(--cs-card-rail-padding, 6px);
            background-color: var(--cs-card-rail-bg);
            border-radius: var(--cs-card-rail-radius, var(--cs-card-inner-radius));
            corner-shape: var(--cs-squircle-smooth);
            box-shadow: var(--cs-card-rail-shadow, none);

            &[data-columns="1"] {
                grid-template-columns: auto;
            }

            &[data-columns="2"] {
                grid-template-columns: repeat(2, auto);
            }

            &[data-columns="auto"] {
                grid-auto-columns: auto;
                grid-auto-flow: column;
            }

            &[data-variant="sunken"] {
                --cs-card-rail-bg: var(--cs-color-sunken);
                --cs-card-rail-shadow: var(--cs-shadow-sunken);
            }

            &[data-variant="soft"] {
                --cs-card-rail-bg: var(--cs-color-base-soft);
                --cs-card-rail-shadow: none;
            }

            &[data-variant="transparent"] {
                --cs-card-rail-bg: transparent;
                --cs-card-rail-shadow: none;
                --cs-card-rail-padding: 0px;
            }
        }
    }
</style>
