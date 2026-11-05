import { dotShortcuts } from "./dots";
import { layoutShortcuts } from "./layout";
import { typographyShortcuts } from "./typography";

export const shortcuts: Record<string, string> = {
    ...layoutShortcuts,
    ...dotShortcuts,
    ...typographyShortcuts,
};

export { dotShortcuts } from "./dots";
export { layoutShortcuts } from "./layout";
export { typographyShortcuts } from "./typography";
