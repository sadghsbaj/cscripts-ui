<script lang="ts">
    import { untrack } from "svelte";
    import type { MouseEventHandler } from "svelte/elements";

    import type { CloseButtonSize, CloseButtonVariant } from "../close-button/index.ts";
    import Self from "./CardTestHost.internal.svelte";
    import {
        Card,
        CardActions,
        CardBody,
        CardClose,
        CardDescription,
        CardFooter,
        CardHeader,
        CardMedia,
        CardOrnament,
        CardRail,
        CardTitle,
        getCardContext,
        hasCardContext,
        type CardActionsAlign,
        type CardActionsOrientation,
        type CardContext,
        type CardMediaFit,
        type CardMediaPlacement,
        type CardMediaRatio,
        type CardOrientation,
        type CardOrnamentPlacement,
        type CardOrnamentShape,
        type CardRailColumns,
        type CardRailPlacement,
        type CardRailVariant,
        type CardSize,
        type CardTitleElement,
        type CardVariant,
    } from "./index.ts";

    interface Props {
        mode?: "full" | "probe";
        probeId?: string;
        variant?: CardVariant;
        size?: CardSize;
        orientation?: CardOrientation;
        cardClass?: string;
        cardAttrs?: Record<string, unknown>;
        cardRef?: HTMLDivElement | null;

        showMedia?: boolean;
        mediaPlacement?: CardMediaPlacement;
        mediaRatio?: CardMediaRatio;
        mediaFit?: CardMediaFit;
        mediaBleed?: boolean;
        mediaClass?: string;
        mediaAttrs?: Record<string, unknown>;
        mediaRef?: HTMLDivElement | null;

        showHeader?: boolean;
        showHeaderControl?: boolean;
        showBareTitle?: boolean;
        headerClass?: string;
        headerAttrs?: Record<string, unknown>;
        headerRef?: HTMLDivElement | null;

        titleText?: string;
        titleAs?: CardTitleElement;
        titleClass?: string;
        titleAttrs?: Record<string, unknown>;
        titleRef?: HTMLHeadingElement | HTMLDivElement | null;

        descriptionText?: string;
        descriptionClass?: string;
        descriptionAttrs?: Record<string, unknown>;
        descriptionRef?: HTMLParagraphElement | null;

        showBody?: boolean;
        showBodyControl?: boolean;
        bodyText?: string;
        bodyClass?: string;
        bodyAttrs?: Record<string, unknown>;
        bodyRef?: HTMLDivElement | null;

        showFooter?: boolean;
        footerMeta?: string;
        footerClass?: string;
        footerAttrs?: Record<string, unknown>;
        footerRef?: HTMLDivElement | null;

        showActions?: boolean;
        actionsAlign?: CardActionsAlign;
        actionsOrientation?: CardActionsOrientation;
        actionsClass?: string;
        actionsAttrs?: Record<string, unknown>;
        actionsRef?: HTMLDivElement | null;

        showRail?: boolean;
        railVariant?: CardRailVariant;
        railPlacement?: CardRailPlacement;
        railColumns?: CardRailColumns;
        railClass?: string;
        railAttrs?: Record<string, unknown>;
        railRef?: HTMLDivElement | null;

        showOrnament?: boolean;
        ornamentPlacement?: CardOrnamentPlacement;
        ornamentShape?: CardOrnamentShape;
        ornamentClass?: string;
        ornamentAttrs?: Record<string, unknown>;
        ornamentRef?: HTMLDivElement | null;

        showClose?: boolean;
        closePosition?: "first" | "after-header" | "end";
        closeVariant?: CloseButtonVariant;
        closeSize?: CloseButtonSize;
        closeDisabled?: boolean;
        closeClass?: string;
        closeAttrs?: Record<string, unknown>;
        closeRef?: HTMLButtonElement | null;
        onCloseClick?: MouseEventHandler<HTMLButtonElement>;

        showRawChild?: boolean;
        rawChildText?: string;
        showProbe?: boolean;

        showInnerCard?: boolean;
        innerVariant?: CardVariant;
        innerSize?: CardSize;
        innerOrientation?: CardOrientation;
        innerAttrs?: Record<string, unknown>;
        showInnerMedia?: boolean;
        showInnerClose?: boolean;
        showInnerProbe?: boolean;

        showDeepCard?: boolean;
        deepVariant?: CardVariant;
        deepSize?: CardSize;
        deepOrientation?: CardOrientation;
        deepAttrs?: Record<string, unknown>;
        showDeepMedia?: boolean;
        showDeepClose?: boolean;
        showDeepProbe?: boolean;
    }

    let {
        mode = "full",
        probeId = "context-probe",
        variant = "elevated",
        size = "md",
        orientation,
        cardClass,
        cardAttrs = {},
        cardRef = $bindable(null),

        showMedia = false,
        mediaPlacement,
        mediaRatio,
        mediaFit,
        mediaBleed,
        mediaClass,
        mediaAttrs = {},
        mediaRef = $bindable(null),

        showHeader = true,
        showHeaderControl = false,
        showBareTitle = false,
        headerClass,
        headerAttrs = {},
        headerRef = $bindable(null),

        titleText = "Card Title",
        titleAs,
        titleClass,
        titleAttrs = {},
        titleRef = $bindable(null),

        descriptionText = "Card description",
        descriptionClass,
        descriptionAttrs = {},
        descriptionRef = $bindable(null),

        showBody = false,
        showBodyControl = false,
        bodyText = "Card body content",
        bodyClass,
        bodyAttrs = {},
        bodyRef = $bindable(null),

        showFooter = false,
        footerMeta = "Updated just now",
        footerClass,
        footerAttrs = {},
        footerRef = $bindable(null),

        showActions = false,
        actionsAlign,
        actionsOrientation,
        actionsClass,
        actionsAttrs = {},
        actionsRef = $bindable(null),

        showRail = false,
        railVariant = "sunken",
        railPlacement,
        railColumns,
        railClass,
        railAttrs = {},
        railRef = $bindable(null),

        showOrnament = false,
        ornamentPlacement,
        ornamentShape,
        ornamentClass,
        ornamentAttrs = {},
        ornamentRef = $bindable(null),

        showClose = false,
        closePosition = "after-header",
        closeVariant = "soft",
        closeSize,
        closeDisabled = false,
        closeClass,
        closeAttrs = {},
        closeRef = $bindable(null),
        onCloseClick,

        showRawChild = false,
        rawChildText = "Raw inline child",
        showProbe = false,

        showInnerCard = false,
        innerVariant = "soft",
        innerSize = "sm",
        innerOrientation = "vertical",
        innerAttrs = {},
        showInnerMedia = false,
        showInnerClose = false,
        showInnerProbe = false,

        showDeepCard = false,
        deepVariant = "sunken",
        deepSize = "sm",
        deepOrientation = "vertical",
        deepAttrs = {},
        showDeepMedia = false,
        showDeepClose = false,
        showDeepProbe = false,
    }: Props = $props();

    function readCardContextProbe(): { hasCtx: boolean; threwOnGet: boolean; ctx: CardContext | undefined } {
        const hasCtx = hasCardContext();
        let threwOnGet = false;
        let ctx: CardContext | undefined;
        try {
            ctx = getCardContext();
        } catch {
            threwOnGet = true;
        }
        return { hasCtx, threwOnGet, ctx };
    }

    const probe = untrack(() => (mode === "probe" ? readCardContextProbe() : undefined));
</script>

{#snippet closeButton()}
    <CardClose
        bind:ref={closeRef}
        variant={closeVariant}
        size={closeSize}
        disabled={closeDisabled}
        onclick={onCloseClick}
        class={closeClass}
        {...closeAttrs}
    />
{/snippet}

{#if mode === "probe" && probe}
    <div
        data-testid={probeId}
        data-has-context={String(probe.hasCtx)}
        data-threw-on-get={String(probe.threwOnGet)}
        data-ctx-variant={probe.ctx?.variant}
        data-ctx-size={probe.ctx?.size}
        data-ctx-orientation={probe.ctx?.orientation}
    ></div>
{:else}
    <Card bind:ref={cardRef} {variant} {size} {orientation} class={cardClass} {...cardAttrs}>
        {#if showClose && closePosition === "first"}
            {@render closeButton()}
        {/if}

        {#if showOrnament}
            <CardOrnament
                bind:ref={ornamentRef}
                placement={ornamentPlacement}
                shape={ornamentShape}
                class={ornamentClass}
                {...ornamentAttrs}
            >
                <span data-testid="ornament-glyph">*</span>
            </CardOrnament>
        {/if}

        {#if showMedia}
            <CardMedia
                bind:ref={mediaRef}
                placement={mediaPlacement}
                ratio={mediaRatio}
                fit={mediaFit}
                bleed={mediaBleed}
                class={mediaClass}
                {...mediaAttrs}
            >
                <img src="data:image/gif;base64,R0lGODlhAQABAAAAACw=" alt="Card media" />
            </CardMedia>
        {/if}

        {#if showHeader}
            <CardHeader bind:ref={headerRef} class={headerClass} {...headerAttrs}>
                {#if showHeaderControl}
                    <button type="button" data-testid="header-control">Header action</button>
                {/if}
                {#if titleText}
                    <CardTitle bind:ref={titleRef} as={titleAs} class={titleClass} {...titleAttrs}>
                        {titleText}
                    </CardTitle>
                {/if}
                {#if descriptionText}
                    <CardDescription bind:ref={descriptionRef} class={descriptionClass} {...descriptionAttrs}>
                        {descriptionText}
                    </CardDescription>
                {/if}
            </CardHeader>
        {:else if showBareTitle && titleText}
            <CardTitle bind:ref={titleRef} as={titleAs} class={titleClass} {...titleAttrs}>
                {titleText}
            </CardTitle>
        {/if}

        {#if showClose && closePosition === "after-header"}
            {@render closeButton()}
        {/if}

        {#if showBody}
            <CardBody bind:ref={bodyRef} class={bodyClass} {...bodyAttrs}>
                <p>{bodyText}</p>
                {#if showBodyControl}
                    <button type="button" data-testid="body-control">Body action</button>
                {/if}
            </CardBody>
        {/if}

        {#if showRawChild}
            <div data-testid="raw-child">{rawChildText}</div>
        {/if}

        {#if showRail}
            <CardRail
                bind:ref={railRef}
                variant={railVariant}
                placement={railPlacement}
                columns={railColumns}
                class={railClass}
                {...railAttrs}
            >
                <button type="button">Light</button>
                <button type="button">Fan</button>
            </CardRail>
        {/if}

        {#if showFooter}
            <CardFooter bind:ref={footerRef} class={footerClass} {...footerAttrs}>
                {#if footerMeta}
                    <span data-testid="footer-meta">{footerMeta}</span>
                {/if}
                {#if showActions}
                    <CardActions
                        bind:ref={actionsRef}
                        align={actionsAlign}
                        orientation={actionsOrientation}
                        class={actionsClass}
                        {...actionsAttrs}
                    >
                        <button type="button">Cancel</button>
                        <button type="button">Confirm</button>
                    </CardActions>
                {/if}
            </CardFooter>
        {:else if showActions}
            <CardActions
                bind:ref={actionsRef}
                align={actionsAlign}
                orientation={actionsOrientation}
                class={actionsClass}
                {...actionsAttrs}
            >
                <button type="button">Action</button>
            </CardActions>
        {/if}

        {#if showClose && closePosition === "end"}
            {@render closeButton()}
        {/if}

        {#if showProbe}
            <Self mode="probe" />
        {/if}

        {#if showInnerCard}
            <Card variant={innerVariant} size={innerSize} orientation={innerOrientation} {...innerAttrs}>
                {#if showInnerMedia}
                    <CardMedia data-testid="inner-media">
                        <img src="data:image/gif;base64,R0lGODlhAQABAAAAACw=" alt="Inner media" />
                    </CardMedia>
                {/if}
                {#if showInnerClose}
                    <CardClose variant="soft" data-testid="inner-close" />
                {/if}
                {#if showInnerProbe}
                    <Self mode="probe" probeId="inner-probe" />
                {/if}
                {#if showDeepCard}
                    <Card variant={deepVariant} size={deepSize} orientation={deepOrientation} {...deepAttrs}>
                        {#if showDeepMedia}
                            <CardMedia data-testid="deep-media">
                                <img src="data:image/gif;base64,R0lGODlhAQABAAAAACw=" alt="Deep media" />
                            </CardMedia>
                        {/if}
                        {#if showDeepClose}
                            <CardClose variant="ghost" data-testid="deep-close" />
                        {/if}
                        {#if showDeepProbe}
                            <Self mode="probe" probeId="deep-probe" />
                        {/if}
                    </Card>
                {/if}
            </Card>
        {/if}
    </Card>
{/if}
