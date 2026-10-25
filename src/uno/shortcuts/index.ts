import { dotShortcuts } from "./dots.ts";
import { layoutShortcuts } from "./layout.ts";
import { typographyShortcuts } from "./typography.ts";

export const shortcuts: Record<string, string> = {
    ...layoutShortcuts,
    ...dotShortcuts,
    ...typographyShortcuts,
};

export { dotShortcuts } from "./dots.ts";
export { layoutShortcuts } from "./layout.ts";
export { typographyShortcuts } from "./typography.ts";
