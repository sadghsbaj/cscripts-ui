import { createContext } from "svelte";

export type SurfaceSize = "sm" | "md" | "lg";

export const SURFACE_INNER_RADIUS_PX: Record<SurfaceSize, number> = {
    sm: 8,
    md: 10,
    lg: 12,
};

export const SURFACE_PADDING_PX: Record<SurfaceSize, number> = {
    sm: 12,
    md: 16,
    lg: 24,
};

export const [getSurfaceRadiusContext, setSurfaceRadiusContext, hasSurfaceRadiusContext] =
    createContext<() => number>();

export interface SurfaceRadiusState {
    readonly isNested: boolean;
    readonly nestedRadius: string | undefined;
}

/**
 * Tracks concentric corner radii across nested surface containers (e.g. `Card`, `KpiCard`).
 */
export function createSurfaceRadius(getSize: () => SurfaceSize): SurfaceRadiusState {
    const parentInnerRadius = hasSurfaceRadiusContext() ? getSurfaceRadiusContext() : undefined;
    const isNested = parentInnerRadius !== undefined;
    const nestedRadius = $derived(parentInnerRadius !== undefined ? `${parentInnerRadius()}px` : undefined);

    const ownInnerRadius = $derived.by(() => {
        const size = getSize();
        if (parentInnerRadius === undefined) {
            return SURFACE_INNER_RADIUS_PX[size];
        }
        return Math.max(8, parentInnerRadius() - SURFACE_PADDING_PX[size]);
    });

    setSurfaceRadiusContext(() => ownInnerRadius);

    return {
        get isNested() {
            return isNested;
        },
        get nestedRadius() {
            return nestedRadius;
        },
    };
}
