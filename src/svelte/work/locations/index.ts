import type { SVGAttributes } from "svelte/elements";

import type { WorkLocationId } from "./locations.ts";

export { default as WorkLocation } from "./WorkLocation.svelte";
export * from "./locations.ts";

export interface WorkLocationProps extends Omit<SVGAttributes<SVGSVGElement>, "children"> {
    location: WorkLocationId;
    marker?: boolean;
}
