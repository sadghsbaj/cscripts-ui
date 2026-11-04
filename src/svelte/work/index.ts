import type { Snippet } from "svelte";
import type { SVGAttributes } from "svelte/elements";

import type { WorkLocationDefinition, WorkLocationId, WorkLocationMarker } from "./locations.ts";

export { default as WorkLocation } from "./WorkLocation.svelte";
export * from "./locations.ts";

export interface WorkLocationProps extends Omit<SVGAttributes<SVGSVGElement>, "children"> {
    location: WorkLocationId;
    /**
     * Controls the plant location marker:
     * - `false` (default): hides the marker and renders only the region outline
     * - `true`: renders the default `<circle class="cs-work-location-marker" />`
     * - `Snippet<[WorkLocationMarker]>`: renders custom SVG content at `{ x, y, xPercent, yPercent }`
     */
    marker?: boolean | Snippet<[WorkLocationMarker]>;
    children?: Snippet<[WorkLocationDefinition]>;
}
