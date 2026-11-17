import type { Component, Snippet } from "svelte";
import type { HTMLAttributes, HTMLButtonAttributes, SVGAttributes } from "svelte/elements";

import type { CloseButtonProps, CloseButtonSize, CloseButtonVariant } from "../close-button/index.ts";

export { default as Toaster } from "./Toaster.svelte";
export { default as Toast } from "./Toast.svelte";
export { default as ToastIcon } from "./ToastIcon.svelte";
export { default as ToastTitle } from "./ToastTitle.svelte";
export { default as ToastDescription } from "./ToastDescription.svelte";
export { default as ToastAction } from "./ToastAction.svelte";
export { default as ToastClose } from "./ToastClose.svelte";
export { toast, toastState } from "./toast-state.svelte.ts";

export const TOAST_COLORS = ["base", "accent", "positive", "caution", "negative"] as const;
export const TOAST_PLACEMENTS = [
    "bottom-right",
    "bottom-center",
    "bottom-left",
    "top-right",
    "top-center",
    "top-left",
] as const;

export type ToastColor = (typeof TOAST_COLORS)[number];
export type ToastPlacement = (typeof TOAST_PLACEMENTS)[number];

export type ToastIconComponentProps = Omit<SVGAttributes<SVGSVGElement>, "children" | "color"> &
    Record<string, unknown> & {
        color?: string;
    };

export type ToastIconComponent = Component<ToastIconComponentProps>;

export interface ToastActionConfig {
    label: string;
    onClick: (event: MouseEvent) => void;
    /**
     * Visual emphasis of the toast action button.
     * @default "secondary"
     */
    variant?: "secondary" | "tertiary";
}

export interface ToastOptions {
    /** Optional unique identifier; passing an existing id updates that toast in-place. */
    id?: string;
    title: string;
    description?: string;
    /** Explicit semantic color for the toast icon plate and ARIA politeness. */
    color: ToastColor;
    /** `undefined` uses the default icon for `color`; `false` omits the icon plate; a Component overrides it. */
    icon?: ToastIconComponent | false;
    action?: ToastActionConfig;
    /**
     * Auto-dismiss duration in milliseconds. Inherits `<Toaster duration />` when omitted.
     * Pass `Infinity` for a persistent toast.
     */
    duration?: number;
    /**
     * Whether the toast renders a close button and supports swipe/Escape dismissal.
     * @default true
     */
    dismissible?: boolean;
    onDismiss?: (toast: ToastRecord) => void;
    onAutoClose?: (toast: ToastRecord) => void;
}

export type ToastShorthandOptions = Omit<ToastOptions, "color">;
export type ToastShorthandConfig = Omit<ToastOptions, "color" | "title">;

export type ToastCustomOptions = Omit<ToastOptions, "title" | "description" | "icon" | "action">;

export interface ToastSnippetProps {
    id: string;
    color: ToastColor;
    dismissible: boolean;
    dismiss: () => void;
}

export type ToastPromiseMessage = string | (Omit<ToastOptions, "color"> & { color?: ToastColor });

export interface ToastPromiseOptions<T> {
    /**
     * Pending state content. Defaults to `color: "base"` and `duration: Infinity` when omitted.
     */
    loading: ToastPromiseMessage;
    /**
     * Fulfilled state content or mapper. Defaults to `color: "positive"`.
     */
    success: ToastPromiseMessage | ((data: T) => ToastPromiseMessage);
    /**
     * Rejected state content or mapper. Defaults to `color: "negative"`.
     */
    error: ToastPromiseMessage | ((error: unknown) => ToastPromiseMessage);
}

export interface ToastRecord {
    id: string;
    color: ToastColor;
    title?: string;
    description?: string;
    icon?: ToastIconComponent | false;
    action?: ToastActionConfig;
    render?: Snippet<[ToastSnippetProps]>;
    duration?: number;
    dismissible: boolean;
    mounted: boolean;
    removed: boolean;
    updatedAt: number;
    onDismiss?: (toast: ToastRecord) => void;
    onAutoClose?: (toast: ToastRecord) => void;
}

export interface ToastApi {
    (options: ToastOptions): string;
    base: (titleOrOptions: string | ToastShorthandOptions, options?: ToastShorthandConfig) => string;
    accent: (titleOrOptions: string | ToastShorthandOptions, options?: ToastShorthandConfig) => string;
    positive: (titleOrOptions: string | ToastShorthandOptions, options?: ToastShorthandConfig) => string;
    caution: (titleOrOptions: string | ToastShorthandOptions, options?: ToastShorthandConfig) => string;
    negative: (titleOrOptions: string | ToastShorthandOptions, options?: ToastShorthandConfig) => string;
    custom: (render: Snippet<[ToastSnippetProps]>, options: ToastCustomOptions) => string;
    promise: <T>(promise: Promise<T> | (() => Promise<T>), messages: ToastPromiseOptions<T>) => Promise<T>;
    dismiss: (id?: string) => void;
}

export type ToasterProps = Omit<HTMLAttributes<HTMLElement>, "popover"> & {
    ref?: HTMLElement | null;
    /**
     * Viewport anchor corner or edge.
     * @default "bottom-right"
     */
    placement?: ToastPlacement;
    /**
     * Default auto-dismiss duration in milliseconds.
     * @default 4000
     */
    duration?: number;
    /**
     * Maximum number of visible stacked toasts when collapsed.
     * @default 3
     */
    maxVisible?: number;
    /**
     * Vertical gap between stacked toasts in pixels.
     * @default 12
     */
    gap?: number;
    /**
     * Overrides `--cs-toast-viewport-offset` (numbers are formatted as `px`).
     */
    offset?: string | number;
    /**
     * Accessible label for the notifications landmark region.
     */
    ariaLabel?: string;
};

export type ToastProps = Omit<HTMLAttributes<HTMLDivElement>, "color"> & {
    ref?: HTMLDivElement | null;
    /** Explicit semantic color for the toast icon plate and ARIA politeness. */
    color: ToastColor;
    /**
     * Whether the toast reserves clearance for `<ToastClose />` and allows dismissal.
     * @default true
     */
    dismissible?: boolean;
    onDismiss?: () => void;
    children?: Snippet;
};

export type ToastIconProps = Omit<HTMLAttributes<HTMLSpanElement>, "color"> & {
    ref?: HTMLSpanElement | null;
    icon?: ToastIconComponent;
    color?: string;
    strokeWidth?: number | string;
};

export type ToastTitleProps = HTMLAttributes<HTMLDivElement> & {
    ref?: HTMLDivElement | null;
};

export type ToastDescriptionProps = HTMLAttributes<HTMLDivElement> & {
    ref?: HTMLDivElement | null;
};

export type ToastActionProps = Omit<HTMLButtonAttributes, "color" | "size"> & {
    ref?: HTMLButtonElement | null;
    /**
     * Visual emphasis of the toast action button.
     * @default "secondary"
     */
    variant?: "secondary" | "tertiary";
    negative?: boolean;
    children?: Snippet;
};

export type ToastCloseProps = Omit<CloseButtonProps, "variant" | "size"> & {
    /** @default "soft" */
    variant?: CloseButtonVariant;
    /** @default "sm" */
    size?: CloseButtonSize;
};
