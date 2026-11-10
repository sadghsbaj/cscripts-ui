import type { HTMLAttributes } from "svelte/elements";

export * from "./clipboard.utils.ts";
export * from "./copy-on-click.attach.ts";
export * from "./paste-on-click.attach.ts";
export { default as CopyIcon } from "./CopyIcon.svelte";

export const COPY_ICON_STATUSES = ["idle", "pending", "copied", "error"] as const;

export type CopyIconStatus = (typeof COPY_ICON_STATUSES)[number];

export interface CopyIconProps extends Omit<HTMLAttributes<HTMLSpanElement>, "children"> {
    /**
     * Optional explicit status override when not driven automatically by a parent `copyOnClick` attachment.
     */
    status?: CopyIconStatus;
    /**
     * Boolean shorthand for `status="copied"`.
     */
    copied?: boolean;
    /**
     * Boolean shorthand for `status="error"`.
     */
    error?: boolean;
    /**
     * Boolean shorthand for `status="pending"`.
     */
    pending?: boolean;
}
