import { createContext } from "svelte";
import type { HTMLAttributes } from "svelte/elements";

import type { CloseButtonProps, CloseButtonSize, CloseButtonVariant } from "../close-button/index.ts";
import type { FocusTrapTarget } from "../focus/index.ts";

export { default as Modal } from "./Modal.svelte";
export { default as ModalHeader } from "./ModalHeader.svelte";
export { default as ModalSubtitle } from "./ModalSubtitle.svelte";
export { default as ModalTitle } from "./ModalTitle.svelte";
export { default as ModalDescription } from "./ModalDescription.svelte";
export { default as ModalBody } from "./ModalBody.svelte";
export { default as ModalFooter } from "./ModalFooter.svelte";
export { default as ModalActions } from "./ModalActions.svelte";
export { default as ModalClose } from "./ModalClose.svelte";

export const MODAL_SIZES = ["sm", "md", "lg", "xl", "full"] as const;
export const MODAL_TITLE_ELEMENTS = ["h1", "h2", "h3", "h4", "h5", "h6", "div"] as const;
export const MODAL_ACTIONS_ALIGNS = ["start", "end", "stretch"] as const;
export const MODAL_ACTIONS_ORIENTATIONS = ["horizontal", "vertical"] as const;
export const MODAL_CLOSE_REASONS = ["escape", "outside-click", "close-button", "programmatic"] as const;

export type ModalSize = (typeof MODAL_SIZES)[number];
export type ModalTitleElement = (typeof MODAL_TITLE_ELEMENTS)[number];
export type ModalActionsAlign = (typeof MODAL_ACTIONS_ALIGNS)[number];
export type ModalActionsOrientation = (typeof MODAL_ACTIONS_ORIENTATIONS)[number];
export type ModalCloseReason = (typeof MODAL_CLOSE_REASONS)[number];

export type ModalProps = HTMLAttributes<HTMLDivElement> & {
    ref?: HTMLDivElement | null;
    /**
     * Controls active dialog state (e.g. `focusTrap` activation) and syncs with
     * `{#if open}` around the external `<Overlay>`.
     * @default true
     */
    open?: boolean;
    /** Explicit T-shirt size mapped to container width tokens. Required. */
    size: ModalSize;

    /** Master dismissibility flag for Escape key dismissal. @default true */
    dismissible?: boolean;
    /** Granular override for Escape key dismissal. Defaults to `dismissible`. */
    closeOnEscape?: boolean;

    /** Enables built-in focusTrap attachment. @default true */
    focusTrap?: boolean;
    /** Initial focus target when opened. @default "first-focusable" */
    initialFocus?: FocusTrapTarget | false;
    /** Element or resolver to restore focus to on close. @default true */
    restoreFocus?: boolean | HTMLElement | (() => HTMLElement | null);

    /**
     * Intercepts close requests before `open` becomes `false`.
     * Returning `false` cancels the close.
     */
    onBeforeClose?: (reason: ModalCloseReason) => boolean | void | Promise<boolean | void>;
    /** Called after a close request succeeds and `open` transitions to `false`. */
    onClose?: (reason: ModalCloseReason) => void;
    /** Called whenever `open` changes. */
    onOpenChange?: (open: boolean) => void;
};

export type ModalHeaderProps = HTMLAttributes<HTMLDivElement> & {
    ref?: HTMLDivElement | null;
};

export type ModalSubtitleProps = HTMLAttributes<HTMLParagraphElement> & {
    ref?: HTMLParagraphElement | null;
};

export type ModalTitleProps = HTMLAttributes<HTMLHeadingElement | HTMLDivElement> & {
    ref?: HTMLHeadingElement | HTMLDivElement | null;
    /** Heading level or element tag. @default "h2" */
    as?: ModalTitleElement;
};

export type ModalDescriptionProps = HTMLAttributes<HTMLParagraphElement> & {
    ref?: HTMLParagraphElement | null;
};

export type ModalBodyProps = HTMLAttributes<HTMLDivElement> & {
    ref?: HTMLDivElement | null;
};

export type ModalFooterProps = HTMLAttributes<HTMLDivElement> & {
    ref?: HTMLDivElement | null;
};

export type ModalActionsProps = HTMLAttributes<HTMLDivElement> & {
    ref?: HTMLDivElement | null;
    /** @default "end" */
    align?: ModalActionsAlign;
    /** @default "horizontal" */
    orientation?: ModalActionsOrientation;
};

export type ModalCloseProps = Omit<CloseButtonProps, "variant" | "size"> & {
    /** @default "soft" */
    variant?: CloseButtonVariant;
    /** Defaults proportionally to Modal `size` ("sm"/"md"/"lg" -> "sm", "xl"/"full" -> "md"). */
    size?: CloseButtonSize;
};

export interface ModalContext {
    readonly size: ModalSize;
    readonly dismissible: boolean;
    readonly titleId: string | undefined;
    readonly descriptionId: string | undefined;
    registerTitle: (id: string) => () => void;
    registerDescription: (id: string) => () => void;
    close: (reason?: ModalCloseReason) => void;
}

export const [getModalContext, setModalContext, hasModalContext] = createContext<ModalContext>();
