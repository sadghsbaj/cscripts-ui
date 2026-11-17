<script lang="ts">
    import type { MouseEventHandler } from "svelte/elements";

    import type { CloseButtonSize, CloseButtonVariant } from "../close-button/index.ts";
    import { autoFocus, type FocusTrapTarget } from "../focus/index.ts";
    import { Overlay, type OverlayVariant } from "../overlay/index.ts";
    import Self from "./ModalTestHost.internal.svelte";
    import {
        getModalContext,
        hasModalContext,
        Modal,
        ModalActions,
        ModalBody,
        ModalClose,
        ModalDescription,
        ModalFooter,
        ModalHeader,
        ModalSubtitle,
        ModalTitle,
        type ModalActionsAlign,
        type ModalActionsOrientation,
        type ModalCloseReason,
        type ModalSize,
        type ModalTitleElement,
    } from "./index.ts";

    interface Props {
        mode?: "full" | "probe";
        useOverlay?: boolean;
        overlayVariant?: OverlayVariant;
        overlayCloseOnClick?: boolean;
        overlayAttrs?: Record<string, unknown>;

        open?: boolean;
        size?: ModalSize;
        dismissible?: boolean;
        closeOnEscape?: boolean;
        focusTrap?: boolean;
        initialFocus?: FocusTrapTarget | false;
        restoreFocus?: boolean | HTMLElement | (() => HTMLElement | null);
        onBeforeClose?: (reason: ModalCloseReason) => boolean | void | Promise<boolean | void>;
        onClose?: (reason: ModalCloseReason) => void;
        onOpenChange?: (open: boolean) => void;
        onAnimationEnd?: (event: AnimationEvent) => void;

        modalClass?: string;
        modalAttrs?: Record<string, unknown>;
        modalRef?: HTMLDivElement | null;
        modalInstance?: Modal | undefined;

        showClose?: boolean;
        closeVariant?: CloseButtonVariant;
        closeSize?: CloseButtonSize;
        closeAttrs?: Record<string, unknown>;
        closeRef?: HTMLButtonElement | null;
        onCloseClick?: MouseEventHandler<HTMLButtonElement>;

        showHeader?: boolean;
        headerAttrs?: Record<string, unknown>;
        headerRef?: HTMLDivElement | null;

        showSubtitle?: boolean;
        subtitleText?: string;
        subtitleAttrs?: Record<string, unknown>;
        subtitleRef?: HTMLParagraphElement | null;

        showTitle?: boolean;
        titleAs?: ModalTitleElement;
        titleText?: string;
        titleId?: string;
        titleAttrs?: Record<string, unknown>;
        titleRef?: HTMLHeadingElement | HTMLDivElement | null;

        showDescription?: boolean;
        descriptionText?: string;
        descriptionId?: string;
        descriptionAttrs?: Record<string, unknown>;
        descriptionRef?: HTMLParagraphElement | null;

        showBody?: boolean;
        bodyAttrs?: Record<string, unknown>;
        bodyRef?: HTMLDivElement | null;
        showInput?: boolean;
        useAutoFocusOnInput?: boolean;
        showBodyButtons?: boolean;

        showFooter?: boolean;
        footerAttrs?: Record<string, unknown>;
        footerRef?: HTMLDivElement | null;

        showActions?: boolean;
        actionsAlign?: ModalActionsAlign;
        actionsOrientation?: ModalActionsOrientation;
        actionsAttrs?: Record<string, unknown>;
        actionsRef?: HTMLDivElement | null;

        showTrigger?: boolean;
        showOutsideButton?: boolean;
        showProbe?: boolean;
    }

    let {
        mode = "full",
        useOverlay = false,
        overlayVariant = "blur",
        overlayCloseOnClick = true,
        overlayAttrs = {},

        open = $bindable(true),
        size = "md",
        dismissible = true,
        closeOnEscape,
        focusTrap = true,
        initialFocus = "first-focusable",
        restoreFocus = true,
        onBeforeClose,
        onClose,
        onOpenChange,
        onAnimationEnd,

        modalClass,
        modalAttrs = {},
        modalRef = $bindable(null),
        modalInstance = $bindable(),

        showClose = false,
        closeVariant,
        closeSize,
        closeAttrs = {},
        closeRef = $bindable(null),
        onCloseClick,

        showHeader = false,
        headerAttrs = {},
        headerRef = $bindable(null),

        showSubtitle = false,
        subtitleText = "Modal subtitle",
        subtitleAttrs = {},
        subtitleRef = $bindable(null),

        showTitle = false,
        titleAs = "h2",
        titleText = "Modal title",
        titleId,
        titleAttrs = {},
        titleRef = $bindable(null),

        showDescription = false,
        descriptionText = "Modal description",
        descriptionId,
        descriptionAttrs = {},
        descriptionRef = $bindable(null),

        showBody = false,
        bodyAttrs = {},
        bodyRef = $bindable(null),
        showInput = false,
        useAutoFocusOnInput = false,
        showBodyButtons = false,

        showFooter = false,
        footerAttrs = {},
        footerRef = $bindable(null),

        showActions = false,
        actionsAlign = "end",
        actionsOrientation = "horizontal",
        actionsAttrs = {},
        actionsRef = $bindable(null),

        showTrigger = false,
        showOutsideButton = false,
        showProbe = false,
    }: Props = $props();

    const hasCtx = hasModalContext();
    const { ctx, threwOnGet } = (() => {
        try {
            return { ctx: getModalContext(), threwOnGet: false };
        } catch {
            return { ctx: undefined, threwOnGet: true };
        }
    })();
</script>

{#if mode === "probe"}
    <div
        data-testid="context-probe"
        data-has-context={String(hasCtx)}
        data-threw-on-get={String(threwOnGet)}
        data-ctx-size={ctx?.size ?? ""}
        data-ctx-dismissible={ctx ? String(ctx.dismissible) : ""}
        data-ctx-title-id={ctx?.titleId ?? ""}
        data-ctx-description-id={ctx?.descriptionId ?? ""}
    ></div>
{:else}
    {#if showTrigger}
        <button type="button" data-testid="trigger-btn" onclick={() => (open = true)}>Open Modal</button>
    {/if}

    {#if showOutsideButton}
        <button type="button" data-testid="outside-btn">Outside</button>
    {/if}

    {#snippet modalContent()}
        <Modal
            bind:this={modalInstance}
            bind:ref={modalRef}
            bind:open
            {size}
            {dismissible}
            {closeOnEscape}
            {focusTrap}
            {initialFocus}
            {restoreFocus}
            {onBeforeClose}
            {onClose}
            {onOpenChange}
            onanimationend={onAnimationEnd}
            class={modalClass}
            {...modalAttrs}
        >
            {#if showClose}
                <ModalClose
                    bind:ref={closeRef}
                    variant={closeVariant}
                    size={closeSize}
                    onclick={onCloseClick}
                    {...closeAttrs}
                />
            {/if}

            {#if showHeader}
                <ModalHeader bind:ref={headerRef} {...headerAttrs}>
                    {#if showSubtitle}
                        <ModalSubtitle bind:ref={subtitleRef} {...subtitleAttrs}>{subtitleText}</ModalSubtitle>
                    {/if}
                    {#if showTitle}
                        <ModalTitle bind:ref={titleRef} as={titleAs} id={titleId} {...titleAttrs}>
                            {titleText}
                        </ModalTitle>
                    {/if}
                    {#if showDescription}
                        <ModalDescription bind:ref={descriptionRef} id={descriptionId} {...descriptionAttrs}>
                            {descriptionText}
                        </ModalDescription>
                    {/if}
                </ModalHeader>
            {:else}
                {#if showTitle}
                    <ModalTitle bind:ref={titleRef} as={titleAs} id={titleId} {...titleAttrs}>
                        {titleText}
                    </ModalTitle>
                {/if}
                {#if showDescription}
                    <ModalDescription bind:ref={descriptionRef} id={descriptionId} {...descriptionAttrs}>
                        {descriptionText}
                    </ModalDescription>
                {/if}
            {/if}

            {#if showBody}
                <ModalBody bind:ref={bodyRef} {...bodyAttrs}>
                    {#if showInput}
                        {#if useAutoFocusOnInput}
                            <input data-testid="modal-input" {@attach autoFocus()} />
                        {:else}
                            <input data-testid="modal-input" />
                        {/if}
                    {/if}
                    {#if showBodyButtons}
                        <button type="button" data-testid="body-btn-1">Action 1</button>
                        <button type="button" data-testid="body-btn-2">Action 2</button>
                    {/if}
                </ModalBody>
            {/if}

            {#if showFooter}
                <ModalFooter bind:ref={footerRef} {...footerAttrs}>
                    {#if showActions}
                        <ModalActions
                            bind:ref={actionsRef}
                            align={actionsAlign}
                            orientation={actionsOrientation}
                            {...actionsAttrs}
                        >
                            <button type="button" data-testid="cancel-btn">Cancel</button>
                            <button type="button" data-testid="confirm-btn">Confirm</button>
                        </ModalActions>
                    {/if}
                </ModalFooter>
            {/if}

            {#if showProbe}
                <Self mode="probe" />
            {/if}
        </Modal>
    {/snippet}

    {#if useOverlay}
        {#if open}
            <Overlay
                variant={overlayVariant}
                onclick={overlayCloseOnClick ? () => modalInstance?.requestClose("outside-click") : undefined}
                {...overlayAttrs}
            >
                {@render modalContent()}
            </Overlay>
        {/if}
    {:else if open}
        {@render modalContent()}
    {/if}
{/if}
