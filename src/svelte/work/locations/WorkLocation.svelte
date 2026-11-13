<!--
@component
SVG map primitive (`<WorkLocation />`) for rendering company plant regions (`arnsberg`, `baruth`,
`guetersloh`, `leutkirch`, `neumarkt`) with an optional location marker.
-->
<script lang="ts">
    import { WORK_LOCATIONS, type WorkLocationProps } from "../index.ts";

    let { location, marker = false, class: className, ...rest }: WorkLocationProps = $props();

    let data = $derived(WORK_LOCATIONS[location]);
</script>

<svg
    aria-hidden="true"
    {...rest}
    xmlns="http://www.w3.org/2000/svg"
    viewBox={data.viewBox}
    class={["cs-work-location", className]}
    data-location={location}
>
    <path class="cs-work-location-map" pathLength="1" d={data.path} />

    {#if marker}
        <circle class="cs-work-location-marker" cx={data.marker.x} cy={data.marker.y} />
    {/if}
</svg>

<style>
    @layer components.primitive {
        .cs-work-location {
            --cs-work-location-stroke: currentColor;
            --cs-work-location-fill: color-mix(in oklch, var(--cs-work-location-stroke) 12%, transparent);
            --cs-work-location-stroke-width: 8px;

            --cs-work-location-marker-fill: var(--cs-work-location-stroke);
            --cs-work-location-marker-stroke: var(--cs-color-elevated);
            --cs-work-location-marker-stroke-width: 9px;
            --cs-work-location-marker-radius: 30px;
            --cs-work-location-marker-scale: 1;

            display: block;
            overflow: visible;
        }

        .cs-work-location-map {
            fill: var(--cs-work-location-fill);
            fill-rule: evenodd;
            stroke: var(--cs-work-location-stroke);
            stroke-width: var(--cs-work-location-stroke-width);
            stroke-linejoin: round;
        }

        .cs-work-location-marker {
            r: var(--cs-work-location-marker-radius);
            transform-box: fill-box;
            fill: var(--cs-work-location-marker-fill);
            stroke: var(--cs-work-location-marker-stroke);
            stroke-width: var(--cs-work-location-marker-stroke-width);
            scale: var(--cs-work-location-marker-scale);
            transform-origin: center;
        }
    }
</style>
