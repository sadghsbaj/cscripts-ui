<script lang="ts">
    import { hasSurfaceRadiusContext } from "../../shared/surface-radius/index.ts";
    import type { KpiCardGroupProps } from "./index.ts";

    let { ref = $bindable(null), columns = "auto", class: className, children, ...rest }: KpiCardGroupProps = $props();

    const isNested = hasSurfaceRadiusContext();
</script>

<div
    bind:this={ref}
    {...rest}
    class={["cs-kpi-card-group", className]}
    data-columns={columns}
    data-nested={isNested ? "" : undefined}
>
    {@render children?.()}
</div>

<style>
    @layer components.composite {
        .cs-kpi-card-group {
            display: grid;
            gap: var(--cs-kpi-card-group-gap, 12px);
            inline-size: 100%;
            min-inline-size: 0;

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
                grid-template-columns: repeat(auto-fit, minmax(var(--cs-kpi-card-group-min-size, 220px), 1fr));
            }

            &[data-nested][data-columns="auto"] {
                --cs-kpi-card-group-min-size: 132px;
            }
        }
    }
</style>
