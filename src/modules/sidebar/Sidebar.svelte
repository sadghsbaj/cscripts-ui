<script lang="ts">
    import "./sidebar.css";

    import { onMount, untrack } from "svelte";
    import { focusTrap } from "../focus/index.ts";
    import { Overlay } from "../overlay/index.ts";
    import { t } from "../../shared/lang.internal.ts";
    import { setSidebarContext } from "./sidebar.context.ts";
    import type { SidebarProps, SidebarState } from "./sidebar.types.ts";

    const fallbackId = $props.id();

    let {
        ref = $bindable<HTMLElement | null>(null),
        variant,
        size,
        as = "aside",
        side = "start",
        open = $bindable(true),
        onOpenChange,
        behavior = "inline",
        collapseMode = "hidden",
        width,
        railWidth,
        overlayVariant = "dim",
        animate = true,
        id = fallbackId,
        class: className,
        style: styleAttr,
        ontransitionend,
        children,
        ...rest
    }: SidebarProps = $props();

    const effectiveBehavior = $derived(behavior);
    const effectiveCollapseMode = $derived(
        effectiveBehavior === "overlay" ? "hidden" : collapseMode
    );
    const isOverlay = $derived(effectiveBehavior === "overlay");
    const isRailCollapsed = $derived(
        effectiveBehavior === "inline" && effectiveCollapseMode === "rail" && !open
    );
    const isFullyHidden = $derived(
        !open && (effectiveBehavior === "overlay" || effectiveCollapseMode === "hidden")
    );

    const resolvedLabel = $derived(
        rest["aria-labelledby"]
            ? undefined
            : (rest["aria-label"] ?? t({ de: "Seitenleiste", en: "Sidebar" }))
    );

    const mergedStyle = $derived.by(() => {
        const vars: string[] = [];
        if (width && width !== "fill") {
            vars.push(`--cs-sidebar-width: ${width}`);
        }
        if (railWidth) {
            vars.push(`--cs-sidebar-rail-width: ${railWidth}`);
        }
        if (vars.length === 0) return styleAttr;
        const customVars = `${vars.join("; ")};`;
        if (!styleAttr) return customVars;
        const trimmed = styleAttr.trimEnd();
        const sep = trimmed.endsWith(";") ? " " : "; ";
        return `${trimmed}${sep}${customVars}`;
    });

    let ready = $state(false);
    let sidebarState = $state<SidebarState>(untrack(() => (open ? "open" : "closed")));

    let settleTimer: ReturnType<typeof setTimeout> | undefined;

    function clearSettleTimer(): void {
        if (settleTimer === undefined) return;
        clearTimeout(settleTimer);
        settleTimer = undefined;
    }

    function prefersReducedMotion(): boolean {
        if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
            return false;
        }
        return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    }

    function setOpen(next: boolean): void {
        if (Boolean(open) === next) return;
        open = next;
        onOpenChange?.(next);
    }

    function toggle(): void {
        setOpen(!open);
    }

    setSidebarContext({
        get id() {
            return id;
        },
        get variant() {
            return variant;
        },
        get size() {
            return size;
        },
        get side() {
            return side;
        },
        get behavior() {
            return effectiveBehavior;
        },
        get collapseMode() {
            return effectiveCollapseMode;
        },
        get open() {
            return Boolean(open);
        },
        get animate() {
            return animate;
        },
        get isRailCollapsed() {
            return isRailCollapsed;
        },
        get isOverlay() {
            return isOverlay;
        },
        get isFullyHidden() {
            return isFullyHidden;
        },
        toggle,
        setOpen,
    });

    onMount(() => {
        let mountRaf: number | undefined;
        let mountTimer: ReturnType<typeof setTimeout> | undefined;

        if (typeof requestAnimationFrame === "function") {
            mountRaf = requestAnimationFrame(() => {
                ready = true;
            });
        } else {
            mountTimer = setTimeout(() => {
                ready = true;
            }, 0);
        }

        return () => {
            if (mountRaf !== undefined && typeof cancelAnimationFrame === "function") {
                cancelAnimationFrame(mountRaf);
            }
            if (mountTimer !== undefined) {
                clearTimeout(mountTimer);
            }
            clearSettleTimer();
        };
    });

    let prevOpen = untrack(() => Boolean(open));

    $effect(() => {
        const nextOpen = Boolean(open);
        if (nextOpen === prevOpen) return;
        prevOpen = nextOpen;

        clearSettleTimer();

        if (!ready || !animate || prefersReducedMotion()) {
            sidebarState = nextOpen ? "open" : "closed";
            return;
        }

        sidebarState = nextOpen ? "opening" : "closing";
        const expectedMs =
            effectiveBehavior === "overlay"
                ? nextOpen
                    ? 320
                    : 180
                : nextOpen
                  ? 280
                  : effectiveCollapseMode === "rail"
                    ? 240
                    : 200;

        settleTimer = setTimeout(() => {
            settleTimer = undefined;
            if (Boolean(open) === nextOpen) {
                sidebarState = nextOpen ? "open" : "closed";
            }
        }, expectedMs + 60);
    });

    function handleTransitionEnd(
        event: TransitionEvent & { currentTarget: EventTarget & HTMLElement }
    ): void {
        ontransitionend?.(event);

        const isShellTrack = event.target === ref && event.propertyName === "inline-size";
        const isSurfaceSlide =
            event.target instanceof HTMLElement &&
            event.target.parentElement === ref &&
            event.target.classList.contains("cs-sidebar-surface") &&
            event.propertyName === "translate";

        if (!isShellTrack && !isSurfaceSlide) return;

        clearSettleTimer();
        if (sidebarState === "opening" && open) {
            sidebarState = "open";
        } else if (sidebarState === "closing" && !open) {
            sidebarState = "closed";
        }
    }

    function handleOverlayBackdropClick(): void {
        setOpen(false);
    }
</script>

{#snippet sidebarShell()}
    <svelte:element
        this={as}
        bind:this={ref}
        {...rest}
        {id}
        aria-label={resolvedLabel}
        class={["cs-sidebar", className]}
        style={mergedStyle}
        data-variant={variant}
        data-size={size}
        data-side={side}
        data-behavior={effectiveBehavior}
        data-collapse-mode={effectiveCollapseMode}
        data-open={open ? "" : undefined}
        data-state={sidebarState}
        data-width={width === "fill" ? "fill" : undefined}
        data-animate={animate && ready ? "" : undefined}
        ontransitionend={handleTransitionEnd}
        {@attach focusTrap({
            enabled: Boolean(open) && effectiveBehavior === "overlay",
            initialFocus: "first-focusable",
            fallbackFocus: "self",
            restoreFocus: true,
            allowOutsideClick: (event) =>
                event.target instanceof Element && event.target === ref?.closest(".cs-overlay"),
            onEscape: () => {
                setOpen(false);
            },
        })}
    >
        <div class="cs-sidebar-surface" inert={isFullyHidden ? true : undefined}>
            {@render children?.()}
        </div>
    </svelte:element>
{/snippet}

{#if effectiveBehavior === "overlay"}
    {#if open}
        <Overlay
            class="cs-sidebar-overlay"
            variant={overlayVariant}
            data-side={side}
            data-variant={variant}
            data-size={size}
            data-animate={animate && ready ? "" : undefined}
            onclick={handleOverlayBackdropClick}
        >
            {@render sidebarShell()}
        </Overlay>
    {/if}
{:else}
    {@render sidebarShell()}
{/if}
