import type { HTMLAttributes } from "svelte/elements";

import type {
    PopoverPlacement,
    PopoverProps,
    PopoverWidth,
} from "../../modules/popover/index.ts";
import type { WorkAppStatusColor } from "../app-controls/index.ts";

export { default as WorkWorkspaceGate } from "./WorkWorkspaceGate.svelte";
export { default as WorkWorkspaceMenu } from "./WorkWorkspaceMenu.svelte";

export const WORKSPACE_ACCESS_STATUSES = [
    "unlinked",
    "restoring",
    "needs-permission",
    "ready",
    "stale",
    "unsupported",
] as const;
export type WorkspaceAccessStatus = (typeof WORKSPACE_ACCESS_STATUSES)[number];

export const WORKSPACE_ACCESS_DOT_STATUS_MAP: Record<WorkspaceAccessStatus, WorkAppStatusColor> = {
    ready: "positive",
    restoring: "caution",
    "needs-permission": "caution",
    unlinked: "negative",
    stale: "negative",
    unsupported: "negative",
};

export interface WorkWorkspaceGateProps extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
    ref?: HTMLDivElement | null;
    status: WorkspaceAccessStatus;
    directoryName?: string | null;
    busy?: boolean;
    errorMessage?: string | null;
    appName?: string;
    onselect?: () => void | Promise<void>;
    ongrant?: () => void | Promise<void>;
}

export interface WorkWorkspaceMenuProps extends Omit<
    PopoverProps,
    "placement" | "width" | "children"
> {
    ref?: HTMLDivElement | null;
    id: string;
    status: WorkspaceAccessStatus;
    directoryName?: string | null;
    busy?: boolean;
    errorMessage?: string | null;
    placement?: PopoverPlacement;
    width?: PopoverWidth;
    offset?: string;
    onselect?: () => void | Promise<void>;
    ongrant?: () => void | Promise<void>;
    ondisconnect?: () => void | Promise<void>;
}
