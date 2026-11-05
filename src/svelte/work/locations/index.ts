import type { SVGAttributes } from "svelte/elements";

import type { WorkLocationId } from "./locations";

export { default as WorkLocation } from "./WorkLocation.svelte";
export * from "./locations";

export interface WorkLocationProps extends Omit<SVGAttributes<SVGSVGElement>, "children"> {
    location: WorkLocationId;
    marker?: boolean;
}
