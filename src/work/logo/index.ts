import type { SVGAttributes } from "svelte/elements";

export { default as WorkLogo } from "./WorkLogo.svelte";
export type WorkLogoProps = Omit<SVGAttributes<SVGSVGElement>, "children">;
