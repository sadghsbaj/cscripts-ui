<script lang="ts">
    import { focusTrap as attachFocusTrap } from "../focus/index.ts";
    import { setModalContext, type ModalCloseReason, type ModalProps } from "./index.ts";

    let {
        ref = $bindable(null),
        open = $bindable(true),
        size,
        dismissible = true,
        closeOnEscape,
        focusTrap = true,
        initialFocus = "first-focusable",
        restoreFocus = true,
        onBeforeClose,
        onClose,
        onOpenChange,
        onanimationend,
        class: className,
        children,
        ...rest
    }: ModalProps = $props();

    const effectiveCloseOnEscape = $derived(closeOnEscape ?? dismissible);

    let titleId = $state<string | undefined>();
    let descriptionId = $state<string | undefined>();
    let isBlocked = $state(false);
    let isClosing = false;
    let blockedTimer: ReturnType<typeof setTimeout> | null = null;
    let blockedRafId: number | null = null;

    function clearBlockedTimer(): void {
        if (blockedTimer !== null) {
            clearTimeout(blockedTimer);
            blockedTimer = null;
        }
        if (blockedRafId !== null && typeof cancelAnimationFrame === "function") {
            cancelAnimationFrame(blockedRafId);
            blockedRafId = null;
        }
    }

    function registerTitle(id: string): () => void {
        titleId = id;
        return () => {
            if (titleId === id) {
                titleId = undefined;
            }
        };
    }

    function registerDescription(id: string): () => void {
        descriptionId = id;
        return () => {
            if (descriptionId === id) {
                descriptionId = undefined;
            }
        };
    }

    function startBlockedPulse(): void {
        isBlocked = true;
        blockedTimer = setTimeout(() => {
            isBlocked = false;
            blockedTimer = null;
        }, 320);
    }

    export function nudge(): void {
        const wasBlocked = isBlocked;
        clearBlockedTimer();

        if (!wasBlocked) {
            startBlockedPulse();
            return;
        }

        // Wait one frame so Svelte flushes data-blocked removal before restarting the keyframe.
        isBlocked = false;
        if (typeof requestAnimationFrame === "function") {
            blockedRafId = requestAnimationFrame(() => {
                blockedRafId = null;
                startBlockedPulse();
            });
        } else {
            blockedTimer = setTimeout(startBlockedPulse, 0);
        }
    }

    export async function requestClose(reason: ModalCloseReason = "programmatic"): Promise<boolean> {
        if (!open || isClosing) return false;

        if (reason === "escape" && !effectiveCloseOnEscape) {
            nudge();
            return false;
        }

        if ((reason === "outside-click" || reason === "close-button") && !dismissible) {
            nudge();
            return false;
        }

        if (onBeforeClose) {
            isClosing = true;
            try {
                const allowed = await onBeforeClose(reason);
                if (allowed === false) {
                    nudge();
                    return false;
                }
            } finally {
                isClosing = false;
            }
        }

        if (!open) return false;

        open = false;
        onOpenChange?.(false);
        onClose?.(reason);
        return true;
    }

    function handleAnimationEnd(event: AnimationEvent & { currentTarget: EventTarget & HTMLDivElement }): void {
        onanimationend?.(event);
        if (event.target === event.currentTarget && isBlocked) {
            clearBlockedTimer();
            isBlocked = false;
        }
    }

    function setupCleanup(): () => void {
        return clearBlockedTimer;
    }

    $effect(setupCleanup);

    setModalContext({
        get size() {
            return size;
        },
        get dismissible() {
            return dismissible;
        },
        get titleId() {
            return titleId;
        },
        get descriptionId() {
            return descriptionId;
        },
        registerTitle,
        registerDescription,
        close: (reason = "programmatic") => {
            void requestClose(reason);
        },
    });
</script>

<div
    bind:this={ref}
    role="dialog"
    aria-modal="true"
    aria-labelledby={rest["aria-labelledby"] ?? titleId}
    aria-describedby={rest["aria-describedby"] ?? descriptionId}
    {...rest}
    {@attach attachFocusTrap({
        enabled: () => open && focusTrap,
        initialFocus,
        fallbackFocus: "self",
        restoreFocus,
        // Let pointerdown reach the enclosing Overlay backdrop so Overlay.onclick fires.
        allowOutsideClick: (event) => event.target instanceof Element && event.target === ref?.closest(".cs-overlay"),
        onEscape: () => {
            void requestClose("escape");
        },
    })}
    onanimationend={handleAnimationEnd}
    class={["cs-modal", className]}
    data-size={size}
    data-blocked={isBlocked ? "" : undefined}
>
    {@render children?.()}
</div>

<style>
    @layer components.composite {
        .cs-modal {
            --cs-modal-bg: var(--cs-color-elevated);
            --cs-modal-fg: var(--cs-color-text-main);
            --cs-modal-shadow: var(--cs-shadow-floating);
            --cs-modal-radius: 28px;
            --cs-modal-squircle: var(--cs-squircle);
            --cs-modal-padding: 24px;
            --cs-modal-gap: 16px;
            --cs-modal-header-gap: 4px;
            --cs-modal-close-offset: 16px;
            --cs-modal-close-size: 24px;
            --cs-modal-title-size: var(--cs-text-lg);

            /* Motion */
            --cs-modal-dur-in: var(--cs-dur-enter-md);
            --cs-modal-dur-fade-in: var(--cs-dur-effect);
            --cs-modal-dur-out: var(--cs-dur-exit-md);
            --cs-modal-ease-in: var(--cs-ease-enter);
            --cs-modal-ease-out: var(--cs-ease-exit);
            --cs-modal-scale-start: 0.94;
            --cs-modal-scale-exit: 0.96;
            --cs-modal-translate-y: 8px;

            position: relative;
            display: flex;
            flex-direction: column;
            gap: var(--cs-modal-gap);
            inline-size: 100%;
            max-inline-size: var(--cs-modal-max-width);
            max-block-size: 100%;
            padding: var(--cs-modal-padding);
            overflow: clip;
            color: var(--cs-modal-fg);
            font-family: var(--cs-font-sans);
            background-color: var(--cs-modal-bg);
            border-radius: var(--cs-modal-radius);
            corner-shape: var(--cs-modal-squircle);
            box-shadow: var(--cs-modal-shadow);
            transform-origin: center center;

            /* Exit state when Overlay loses :popover-open */
            opacity: 0;
            scale: var(--cs-modal-scale-exit);
            translate: 0 4px;
            transition:
                opacity var(--cs-modal-dur-out) var(--cs-modal-ease-out),
                scale var(--cs-modal-dur-out) var(--cs-modal-ease-out),
                translate var(--cs-modal-dur-out) var(--cs-modal-ease-out);

            /* =========================================================
             * SIZES
             * ========================================================= */
            &[data-size="sm"] {
                --cs-modal-max-width: var(--cs-container-sm);
                --cs-modal-padding: 20px;
                --cs-modal-gap: 12px;
                --cs-modal-radius: var(--cs-radius-3xl);
                --cs-modal-close-offset: 12px;
                --cs-modal-close-size: 24px;
                --cs-modal-title-size: var(--cs-text-base);
            }

            &[data-size="md"] {
                --cs-modal-max-width: var(--cs-container-lg);
            }

            &[data-size="lg"] {
                --cs-modal-max-width: var(--cs-container-2xl);
            }

            &[data-size="xl"] {
                --cs-modal-max-width: var(--cs-container-4xl);
            }

            &[data-size="full"] {
                --cs-modal-max-width: 100%;
                block-size: 100%;
            }

            &[data-size="xl"],
            &[data-size="full"] {
                --cs-modal-close-size: 32px;
                --cs-modal-close-offset: 12px;
            }

            /* =========================================================
             * CORNER CLOSE BUTTON & CLEARANCE
             * ========================================================= */
            & > :global(.cs-modal-close) {
                position: absolute;
                inset-block-start: var(--cs-modal-close-offset);
                inset-inline-end: var(--cs-modal-close-offset);
                z-index: 2;
            }

            &:has(> :global(.cs-modal-close))
                > :global(:is(.cs-modal-header, .cs-modal-subtitle:first-of-type, .cs-modal-title:first-of-type)),
            &:has(> :global(.cs-modal-close)):not(:has(> :global(.cs-modal-header)))
                > :global(.cs-modal-body:first-of-type) {
                padding-inline-end: calc(
                    var(--cs-modal-close-size) + var(--cs-modal-close-offset) - var(--cs-modal-padding) + 12px
                );
            }

            /* =========================================================
             * BLOCKING FEEDBACK
             * ========================================================= */
            &[data-blocked] {
                animation: cs-modal-blocked var(--cs-dur-280) var(--cs-ease-quad-out);
            }
        }

        :global(.cs-overlay:popover-open) .cs-modal {
            opacity: 1;
            scale: 1;
            translate: 0 0;
            /* Keep compositor layer promoted while open so Button::before does not snap at transitionend. */
            will-change: opacity, translate;
            transition:
                opacity var(--cs-modal-dur-fade-in) var(--cs-ease-effect),
                scale var(--cs-modal-dur-in) var(--cs-modal-ease-in),
                translate var(--cs-modal-dur-in) var(--cs-modal-ease-in);
        }

        @starting-style {
            :global(.cs-overlay:popover-open) .cs-modal {
                opacity: 0;
                scale: var(--cs-modal-scale-start);
                translate: 0 var(--cs-modal-translate-y);
            }
        }

        @keyframes cs-modal-blocked {
            0% {
                scale: 1;
            }
            35% {
                scale: 1.016;
            }
            70% {
                scale: 0.996;
            }
            100% {
                scale: 1;
            }
        }
    }
</style>
