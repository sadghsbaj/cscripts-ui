<script lang="ts">
    import "./avatar.internal.css";

    import type { HTMLAnchorAttributes, HTMLAttributes, HTMLButtonAttributes } from "svelte/elements";

    import { HitArea } from "../hit-area/index.ts";
    import { getAvatarGroupContext, hasAvatarGroupContext } from "./avatar-context.internal.ts";
    import {
        extractAvatarInitials,
        getAvatarStatusLabel,
        resolveAvatarHue,
    } from "./avatar-utils.internal.ts";
    import type { AvatarProps } from "./index.ts";

    let {
        ref = $bindable(null),
        variant,
        size,
        name,
        initials,
        seed,
        color = "auto",
        pattern = "diagonal",
        status,
        disabled = false,
        href,
        onclick,
        style: styleProp,
        class: className,
        children,
        "aria-label": ariaLabelProp,
        "aria-labelledby": ariaLabelledbyProp,
        "aria-hidden": ariaHiddenProp,
        ...rest
    }: AvatarProps = $props();

    const group = hasAvatarGroupContext() ? getAvatarGroupContext() : undefined;
    const resolvedVariant = $derived(variant ?? group?.variant);
    const resolvedSize = $derived(size ?? group?.size);
    const isDisabled = $derived(Boolean(disabled || group?.disabled));

    $effect.pre(() => {
        if (!resolvedVariant || !resolvedSize) {
            throw new Error(
                "<Avatar> requires both `variant` and `size` (directly or via an enclosing <AvatarGroup>).",
            );
        }
    });

    $effect(() => {
        if (!group || !ref) return;
        return group.registerItem(ref);
    });

    const isOverflowHidden = $derived(group ? group.isOverflowHidden(ref) : false);
    const hashSource = $derived(seed?.trim() || name?.trim() || undefined);
    const resolvedColor = $derived(color === "auto" && !hashSource ? "base" : color);
    const autoHue = $derived(
        resolvedColor === "auto" && hashSource ? resolveAvatarHue(hashSource) : undefined,
    );
    const resolvedInitials = $derived(
        resolvedSize && !children ? extractAvatarInitials(name, initials, resolvedSize) : "",
    );

    const isInteractive = $derived(href !== undefined || onclick !== undefined);
    const showHitArea = $derived(isInteractive && !group?.overlap && resolvedSize !== "xl");
    const hitAreaSize = $derived(resolvedSize === "lg" ? "md" : "sm");

    const statusLabel = $derived(status ? getAvatarStatusLabel(status) : undefined);
    const derivedLabel = $derived.by(() => {
        const trimmedName = name?.trim();
        if (!trimmedName) return;
        return statusLabel ? `${trimmedName}, ${statusLabel}` : trimmedName;
    });
    const computedAriaLabel = $derived(ariaLabelProp ?? (ariaLabelledbyProp ? undefined : derivedLabel));

    const isDecorativeStatic = $derived(!isInteractive && !computedAriaLabel && !ariaLabelledbyProp);
    const staticRole = $derived(
        isDecorativeStatic || ariaHiddenProp === "true" || ariaHiddenProp === true ? undefined : "img",
    );
    const staticAriaHidden = $derived(ariaHiddenProp ?? (isDecorativeStatic ? "true" : undefined));

    const mergedStyle = $derived.by(() => {
        if (autoHue === undefined) return styleProp;
        return styleProp ? `--cs-avatar-hue: ${autoHue}; ${styleProp}` : `--cs-avatar-hue: ${autoHue};`;
    });

    const anchorRest = $derived(rest as Omit<HTMLAnchorAttributes, "color" | "size" | "href">);
    const buttonRest = $derived(rest as Omit<HTMLButtonAttributes, "color" | "size" | "type">);
    const spanRest = $derived(rest as Omit<HTMLAttributes<HTMLSpanElement>, "color" | "size">);

    function handleAnchorClick(
        event: MouseEvent & { currentTarget: EventTarget & HTMLAnchorElement },
    ): void {
        if (isDisabled) {
            event.preventDefault();
            event.stopPropagation();
            return;
        }
        (onclick as HTMLAnchorAttributes["onclick"])?.(event);
    }
</script>

{#snippet avatarInner()}
    {#if showHitArea}
        <HitArea size={hitAreaSize} />
    {/if}
    <span class="cs-avatar-surface" aria-hidden="true">
        <span class="cs-avatar-pattern"></span>
        <span class="cs-avatar-content">
            {#if children}
                {@render children()}
            {:else if resolvedInitials}
                {resolvedInitials}
            {:else}
                <svg
                    class="cs-avatar-fallback"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                >
                    <circle cx="12" cy="8" r="4" />
                    <path d="M5 20a7 7 0 0 1 14 0" />
                </svg>
            {/if}
        </span>
    </span>
    {#if status}
        <span class="cs-avatar-status" aria-hidden="true"></span>
    {/if}
{/snippet}

{#if href !== undefined}
    <a
        bind:this={ref}
        {...anchorRest}
        {href}
        onclick={handleAnchorClick}
        class={["cs-avatar", className]}
        style={mergedStyle}
        tabindex={isDisabled ? -1 : anchorRest.tabindex}
        hidden={isOverflowHidden || undefined}
        aria-label={computedAriaLabel}
        aria-labelledby={ariaLabelledbyProp}
        aria-hidden={ariaHiddenProp}
        aria-disabled={isDisabled ? "true" : undefined}
        data-variant={resolvedVariant}
        data-size={resolvedSize}
        data-color={resolvedColor}
        data-pattern={pattern}
        data-status={status}
        data-interactive=""
        data-disabled={isDisabled ? "" : undefined}
        data-overflow-hidden={isOverflowHidden ? "" : undefined}
    >
        {@render avatarInner()}
    </a>
{:else if onclick !== undefined}
    <button
        bind:this={ref}
        {...buttonRest}
        type="button"
        disabled={isDisabled}
        onclick={onclick as HTMLButtonAttributes["onclick"]}
        class={["cs-avatar", className]}
        style={mergedStyle}
        hidden={isOverflowHidden || undefined}
        aria-label={computedAriaLabel}
        aria-labelledby={ariaLabelledbyProp}
        aria-hidden={ariaHiddenProp}
        data-variant={resolvedVariant}
        data-size={resolvedSize}
        data-color={resolvedColor}
        data-pattern={pattern}
        data-status={status}
        data-interactive=""
        data-disabled={isDisabled ? "" : undefined}
        data-overflow-hidden={isOverflowHidden ? "" : undefined}
    >
        {@render avatarInner()}
    </button>
{:else}
    <span
        bind:this={ref}
        {...spanRest}
        role={staticRole}
        class={["cs-avatar", className]}
        style={mergedStyle}
        hidden={isOverflowHidden || undefined}
        aria-label={computedAriaLabel}
        aria-labelledby={ariaLabelledbyProp}
        aria-hidden={staticAriaHidden}
        data-variant={resolvedVariant}
        data-size={resolvedSize}
        data-color={resolvedColor}
        data-pattern={pattern}
        data-status={status}
        data-disabled={isDisabled ? "" : undefined}
        data-overflow-hidden={isOverflowHidden ? "" : undefined}
    >
        {@render avatarInner()}
    </span>
{/if}
