<script lang="ts">
    import type { KpiCardBreakdownProps } from "./index.ts";

    let {
        ref = $bindable(null),
        variant = "plain",
        columns = "auto",
        class: className,
        children,
        ...rest
    }: KpiCardBreakdownProps = $props();
</script>

<div
    bind:this={ref}
    {...rest}
    class={["cs-kpi-card-breakdown", className]}
    data-variant={variant}
    data-columns={columns}
>
    {@render children?.()}
</div>

<style>
    @layer components.composite {
        .cs-kpi-card-breakdown {
            display: grid;
            gap: var(--cs-kpi-card-breakdown-gap, 8px);
            min-inline-size: 0;
            background-color: var(--cs-kpi-card-breakdown-bg, transparent);
            box-shadow: var(--cs-kpi-card-breakdown-shadow, none);

            &[data-columns="1"] {
                grid-template-columns: minmax(0, 1fr);
            }

            &[data-columns="2"] {
                grid-template-columns: repeat(2, minmax(0, 1fr));
            }

            &[data-columns="3"] {
                grid-template-columns: repeat(3, minmax(0, 1fr));
            }

            &[data-columns="4"] {
                grid-template-columns: repeat(4, minmax(0, 1fr));
            }

            &[data-columns="auto"] {
                grid-template-columns: repeat(auto-fit, minmax(112px, 1fr));
            }

            &[data-variant="plain"] {
                --cs-kpi-card-breakdown-bg: transparent;
                --cs-kpi-card-breakdown-shadow: none;

                &[data-columns="1"] {
                    gap: 0;

                    & > :global(.cs-kpi-card-breakdown-item + .cs-kpi-card-breakdown-item) {
                        box-shadow: inset 0 1px 0 0 var(--cs-color-base-soft);
                    }
                }
            }

            &[data-variant="soft"] {
                --cs-kpi-card-breakdown-bg: var(--cs-kpi-card-soft-guard-bg, var(--cs-color-base-soft));
                --cs-kpi-card-breakdown-shadow: none;
                padding: var(--cs-kpi-card-breakdown-padding, 10px);
                border-radius: var(--cs-kpi-card-breakdown-radius, var(--cs-kpi-card-inner-radius));
                corner-shape: var(--cs-squircle-smooth);
            }

            &[data-variant="sunken"] {
                --cs-kpi-card-breakdown-bg: var(--cs-color-sunken);
                --cs-kpi-card-breakdown-shadow: var(--cs-shadow-sunken);
                padding: var(--cs-kpi-card-breakdown-padding, 10px);
                border-radius: var(--cs-kpi-card-breakdown-radius, var(--cs-kpi-card-inner-radius));
                corner-shape: var(--cs-squircle-smooth);
            }
        }
    }
</style>
