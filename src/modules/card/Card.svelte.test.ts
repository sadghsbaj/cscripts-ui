import { flushSync, mount, unmount } from "svelte";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import type { CloseButtonSize, CloseButtonVariant } from "../close-button/index.ts";
import CardTestHost from "./CardTestHost.internal.svelte";
import {
    Card,
    CARD_ACTIONS_ALIGNS,
    CARD_ACTIONS_ORIENTATIONS,
    CARD_MEDIA_FITS,
    CARD_MEDIA_PLACEMENTS,
    CARD_MEDIA_RATIOS,
    CARD_ORIENTATIONS,
    CARD_ORNAMENT_PLACEMENTS,
    CARD_ORNAMENT_SHAPES,
    CARD_RAIL_COLUMNS,
    CARD_RAIL_PLACEMENTS,
    CARD_RAIL_VARIANTS,
    CARD_SIZES,
    CARD_TITLE_ELEMENTS,
    CARD_VARIANTS,
    CardActions,
    CardClose,
    CardDescription,
    CardMedia,
    CardOrnament,
    CardRail,
    CardTitle,
    type CardActionsAlign,
    type CardActionsOrientation,
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

describe("Card Svelte 5 Component", () => {
    let container: HTMLDivElement;

    beforeEach(() => {
        container = document.createElement("div");
        document.body.append(container);
    });

    afterEach(() => {
        container.remove();
        vi.restoreAllMocks();
    });

    describe("Public exports & canonical option lists", () => {
        test("exports canonical option lists", () => {
            expect(CARD_VARIANTS).toEqual(["elevated", "soft", "sunken", "transparent"]);
            expect(CARD_SIZES).toEqual(["sm", "md", "lg"]);
            expect(CARD_ORIENTATIONS).toEqual(["vertical", "horizontal"]);
            expect(CARD_TITLE_ELEMENTS).toEqual(["h2", "h3", "h4", "h5", "h6", "div"]);
            expect(CARD_ACTIONS_ALIGNS).toEqual(["start", "end", "stretch"]);
            expect(CARD_ACTIONS_ORIENTATIONS).toEqual(["horizontal", "vertical"]);
            expect(CARD_MEDIA_PLACEMENTS).toEqual(["top", "bottom", "start", "end"]);
            expect(CARD_MEDIA_RATIOS).toEqual(["auto", "1/1", "4/3", "16/9", "21/9"]);
            expect(CARD_MEDIA_FITS).toEqual(["cover", "contain"]);
            expect(CARD_RAIL_VARIANTS).toEqual(["sunken", "soft", "transparent"]);
            expect(CARD_RAIL_PLACEMENTS).toEqual(["start", "end"]);
            expect(CARD_RAIL_COLUMNS).toEqual([1, 2, "auto"]);
            expect(CARD_ORNAMENT_PLACEMENTS).toEqual(["bottom-left", "bottom-right", "top-right", "inset"]);
            expect(CARD_ORNAMENT_SHAPES).toEqual(["circle", "none"]);
        });
    });

    describe("Root Card contracts", () => {
        test("renders div.cs-card with default vertical orientation, custom class, and forwarded rest attributes", () => {
            const instance = mount(Card, {
                target: container,
                props: {
                    variant: "elevated",
                    size: "md",
                    class: "custom-card",
                    id: "card-root",
                    role: "region",
                    "aria-label": "Server overview",
                    "data-testid": "overview-card",
                },
            });
            flushSync();

            const root = container.querySelector<HTMLDivElement>("div.cs-card");
            expect(root).not.toBeNull();
            expect(root?.tagName).toBe("DIV");
            expect(root?.classList.contains("cs-card")).toBe(true);
            expect(root?.classList.contains("custom-card")).toBe(true);
            expect(root?.dataset.variant).toBe("elevated");
            expect(root?.dataset.size).toBe("md");
            expect(root?.dataset.orientation).toBe("vertical");
            expect(root?.getAttribute("id")).toBe("card-root");
            expect(root?.getAttribute("role")).toBe("region");
            expect(root?.getAttribute("aria-label")).toBe("Server overview");
            expect(root?.dataset.testid).toBe("overview-card");

            unmount(instance);
        });

        test("updates data-variant, data-size, and data-orientation across all allowed values", () => {
            let variant = $state<CardVariant>("elevated");
            let size = $state<CardSize>("sm");
            let orientation = $state<CardOrientation>("vertical");

            const instance = mount(Card, {
                target: container,
                props: {
                    get variant() {
                        return variant;
                    },
                    get size() {
                        return size;
                    },
                    get orientation() {
                        return orientation;
                    },
                },
            });
            flushSync();

            const root = container.querySelector<HTMLDivElement>(".cs-card");
            expect(root).not.toBeNull();

            for (const nextVariant of CARD_VARIANTS) {
                variant = nextVariant;
                flushSync();
                expect(root?.dataset.variant).toBe(nextVariant);
            }

            for (const nextSize of CARD_SIZES) {
                size = nextSize;
                flushSync();
                expect(root?.dataset.size).toBe(nextSize);
            }

            for (const nextOrientation of CARD_ORIENTATIONS) {
                orientation = nextOrientation;
                flushSync();
                expect(root?.dataset.orientation).toBe(nextOrientation);
            }

            unmount(instance);
        });

        test("binds ref to root div element and resets to null on unmount", () => {
            let ref: HTMLDivElement | null = null;

            const instance = mount(Card, {
                target: container,
                props: {
                    variant: "soft",
                    size: "lg",
                    get ref() {
                        return ref;
                    },
                    set ref(el: HTMLDivElement | null) {
                        ref = el;
                    },
                },
            });
            flushSync();

            const root = container.querySelector<HTMLDivElement>("div.cs-card");
            expect(ref).toBe(root);

            unmount(instance);
            expect(ref).toBeNull();
        });
    });

    describe("Context propagation", () => {
        test("hasCardContext() and getCardContext() work inside Card and react to prop changes", () => {
            let variant = $state<CardVariant>("elevated");
            let size = $state<CardSize>("sm");
            let orientation = $state<CardOrientation>("vertical");

            const instance = mount(CardTestHost, {
                target: container,
                props: {
                    get variant() {
                        return variant;
                    },
                    get size() {
                        return size;
                    },
                    get orientation() {
                        return orientation;
                    },
                    showProbe: true,
                },
            });
            flushSync();

            const probe = container.querySelector<HTMLDivElement>('[data-testid="context-probe"]');
            expect(probe).not.toBeNull();
            expect(probe?.dataset.hasContext).toBe("true");
            expect(probe?.dataset.threwOnGet).toBe("false");
            expect(probe?.dataset.ctxVariant).toBe("elevated");
            expect(probe?.dataset.ctxSize).toBe("sm");
            expect(probe?.dataset.ctxOrientation).toBe("vertical");

            variant = "sunken";
            size = "lg";
            orientation = "horizontal";
            flushSync();

            expect(probe?.dataset.ctxVariant).toBe("sunken");
            expect(probe?.dataset.ctxSize).toBe("lg");
            expect(probe?.dataset.ctxOrientation).toBe("horizontal");

            variant = "transparent";
            size = "md";
            orientation = "vertical";
            flushSync();

            expect(probe?.dataset.ctxVariant).toBe("transparent");
            expect(probe?.dataset.ctxSize).toBe("md");
            expect(probe?.dataset.ctxOrientation).toBe("vertical");

            unmount(instance);
        });

        test("hasCardContext() returns false and getCardContext() throws outside Card", () => {
            const instance = mount(CardTestHost, {
                target: container,
                props: {
                    mode: "probe",
                },
            });
            flushSync();

            const probe = container.querySelector<HTMLDivElement>('[data-testid="context-probe"]');
            expect(probe).not.toBeNull();
            expect(probe?.dataset.hasContext).toBe("false");
            expect(probe?.dataset.threwOnGet).toBe("true");

            unmount(instance);
        });

        test("CardMedia resolves default data-placement from Card orientation and respects explicit overrides", () => {
            let orientation = $state<CardOrientation>("vertical");
            let mediaPlacement = $state<CardMediaPlacement | undefined>(undefined);

            const instance = mount(CardTestHost, {
                target: container,
                props: {
                    variant: "elevated",
                    size: "md",
                    get orientation() {
                        return orientation;
                    },
                    showMedia: true,
                    get mediaPlacement() {
                        return mediaPlacement;
                    },
                },
            });
            flushSync();

            const media = container.querySelector<HTMLDivElement>(".cs-card-media");
            expect(media).not.toBeNull();
            expect(media?.dataset.placement).toBe("top");

            // Flip Card orientation vertical -> horizontal while placement is omitted
            orientation = "horizontal";
            flushSync();
            expect(media?.dataset.placement).toBe("start");

            // Flip back horizontal -> vertical
            orientation = "vertical";
            flushSync();
            expect(media?.dataset.placement).toBe("top");

            // Explicit placement overrides context orientation
            mediaPlacement = "bottom";
            flushSync();
            expect(media?.dataset.placement).toBe("bottom");

            orientation = "horizontal";
            flushSync();
            expect(media?.dataset.placement).toBe("bottom");

            mediaPlacement = "end";
            flushSync();
            expect(media?.dataset.placement).toBe("end");

            // Clearing override restores horizontal context default ("start")
            mediaPlacement = undefined;
            flushSync();
            expect(media?.dataset.placement).toBe("start");

            unmount(instance);
        });

        test("CardMedia defaults data-placement to 'top' outside Card context", () => {
            let placement = $state<CardMediaPlacement | undefined>(undefined);

            const instance = mount(CardMedia, {
                target: container,
                props: {
                    get placement() {
                        return placement;
                    },
                },
            });
            flushSync();

            const media = container.querySelector<HTMLDivElement>(".cs-card-media");
            expect(media?.dataset.placement).toBe("top");

            placement = "end";
            flushSync();
            expect(media?.dataset.placement).toBe("end");

            unmount(instance);
        });

        test("CardClose derives proportional CloseButton data-size from Card size and respects explicit overrides", () => {
            let cardSize = $state<CardSize>("sm");
            let closeSize = $state<CloseButtonSize | undefined>(undefined);

            const instance = mount(CardTestHost, {
                target: container,
                props: {
                    variant: "elevated",
                    get size() {
                        return cardSize;
                    },
                    showClose: true,
                    get closeSize() {
                        return closeSize;
                    },
                },
            });
            flushSync();

            const closeBtn = container.querySelector<HTMLButtonElement>("button.cs-card-close");
            expect(closeBtn).not.toBeNull();
            expect(closeBtn?.dataset.size).toBe("xs");

            cardSize = "md";
            flushSync();
            expect(closeBtn?.dataset.size).toBe("sm");

            cardSize = "lg";
            flushSync();
            expect(closeBtn?.dataset.size).toBe("md");

            cardSize = "sm";
            flushSync();
            expect(closeBtn?.dataset.size).toBe("xs");

            // Explicit size override wins regardless of Card size
            closeSize = "xl";
            flushSync();
            expect(closeBtn?.dataset.size).toBe("xl");

            cardSize = "lg";
            flushSync();
            expect(closeBtn?.dataset.size).toBe("xl");

            // Clearing override restores proportional Card size mapping
            closeSize = undefined;
            flushSync();
            expect(closeBtn?.dataset.size).toBe("md");

            unmount(instance);
        });

        test("CardClose defaults data-size to 'sm' outside Card context", () => {
            let size = $state<CloseButtonSize | undefined>(undefined);

            const instance = mount(CardClose, {
                target: container,
                props: {
                    variant: "soft",
                    get size() {
                        return size;
                    },
                },
            });
            flushSync();

            const closeBtn = container.querySelector<HTMLButtonElement>("button.cs-card-close");
            expect(closeBtn?.dataset.size).toBe("sm");

            size = "lg";
            flushSync();
            expect(closeBtn?.dataset.size).toBe("lg");

            unmount(instance);
        });

        test("nested Card isolates context from outer Card while preserving concentric radius and outer subcomponent sync", () => {
            let outerVariant = $state<CardVariant>("elevated");
            let outerSize = $state<CardSize>("lg");
            let outerOrientation = $state<CardOrientation>("horizontal");

            let innerVariant = $state<CardVariant>("soft");
            let innerSize = $state<CardSize>("sm");
            let innerOrientation = $state<CardOrientation>("vertical");

            let deepVariant = $state<CardVariant>("sunken");
            let deepSize = $state<CardSize>("sm");
            let deepOrientation = $state<CardOrientation>("horizontal");

            const instance = mount(CardTestHost, {
                target: container,
                props: {
                    get variant() {
                        return outerVariant;
                    },
                    get size() {
                        return outerSize;
                    },
                    get orientation() {
                        return outerOrientation;
                    },
                    cardAttrs: { "data-testid": "outer-card" },
                    showMedia: true,
                    mediaAttrs: { "data-testid": "outer-media" },
                    showClose: true,
                    closeAttrs: { "data-testid": "outer-close" },
                    showProbe: true,

                    showInnerCard: true,
                    get innerVariant() {
                        return innerVariant;
                    },
                    get innerSize() {
                        return innerSize;
                    },
                    get innerOrientation() {
                        return innerOrientation;
                    },
                    innerAttrs: { "data-testid": "inner-card" },
                    showInnerMedia: true,
                    showInnerClose: true,
                    showInnerProbe: true,

                    showDeepCard: true,
                    get deepVariant() {
                        return deepVariant;
                    },
                    get deepSize() {
                        return deepSize;
                    },
                    get deepOrientation() {
                        return deepOrientation;
                    },
                    deepAttrs: { "data-testid": "deep-card" },
                    showDeepMedia: true,
                    showDeepClose: true,
                    showDeepProbe: true,
                },
            });
            flushSync();

            const outerCard = container.querySelector<HTMLDivElement>('[data-testid="outer-card"]');
            const innerCard = container.querySelector<HTMLDivElement>('[data-testid="inner-card"]');
            const deepCard = container.querySelector<HTMLDivElement>('[data-testid="deep-card"]');

            const outerProbe = container.querySelector<HTMLDivElement>('[data-testid="context-probe"]');
            const innerProbe = container.querySelector<HTMLDivElement>('[data-testid="inner-probe"]');
            const deepProbe = container.querySelector<HTMLDivElement>('[data-testid="deep-probe"]');

            const outerMedia = container.querySelector<HTMLDivElement>('[data-testid="outer-media"]');
            const innerMedia = container.querySelector<HTMLDivElement>('[data-testid="inner-media"]');
            const deepMedia = container.querySelector<HTMLDivElement>('[data-testid="deep-media"]');

            const outerClose = container.querySelector<HTMLButtonElement>('[data-testid="outer-close"]');
            const innerClose = container.querySelector<HTMLButtonElement>('[data-testid="inner-close"]');
            const deepClose = container.querySelector<HTMLButtonElement>('[data-testid="deep-close"]');

            // Outer card is not nested; nested cards have data-nested and concentric --cs-card-nested-radius
            expect(outerCard?.hasAttribute("data-nested")).toBe(false);
            expect(outerCard?.style.getPropertyValue("--cs-card-nested-radius")).toBe("");

            expect(innerCard?.dataset.nested).toBe("");
            expect(innerCard?.style.getPropertyValue("--cs-card-nested-radius")).toBe("12px");

            expect(deepCard?.dataset.nested).toBe("");
            expect(deepCard?.style.getPropertyValue("--cs-card-nested-radius")).toBe("8px");

            // Contexts are isolated per Card level
            expect(outerProbe?.dataset.ctxVariant).toBe("elevated");
            expect(outerProbe?.dataset.ctxSize).toBe("lg");
            expect(outerProbe?.dataset.ctxOrientation).toBe("horizontal");

            expect(innerProbe?.dataset.ctxVariant).toBe("soft");
            expect(innerProbe?.dataset.ctxSize).toBe("sm");
            expect(innerProbe?.dataset.ctxOrientation).toBe("vertical");

            expect(deepProbe?.dataset.ctxVariant).toBe("sunken");
            expect(deepProbe?.dataset.ctxSize).toBe("sm");
            expect(deepProbe?.dataset.ctxOrientation).toBe("horizontal");

            // Subcomponents resolve against their nearest Card ancestor
            expect(outerMedia?.dataset.placement).toBe("start");
            expect(outerClose?.dataset.size).toBe("md");

            expect(innerMedia?.dataset.placement).toBe("top");
            expect(innerClose?.dataset.size).toBe("xs");

            expect(deepMedia?.dataset.placement).toBe("start");
            expect(deepClose?.dataset.size).toBe("xs");

            // Mutate outer Card: outer subcomponents & inner concentric radius update without leaking into inner/deep context
            outerVariant = "transparent";
            outerSize = "md";
            outerOrientation = "vertical";
            flushSync();

            expect(outerProbe?.dataset.ctxVariant).toBe("transparent");
            expect(outerProbe?.dataset.ctxSize).toBe("md");
            expect(outerProbe?.dataset.ctxOrientation).toBe("vertical");
            expect(outerMedia?.dataset.placement).toBe("top");
            expect(outerClose?.dataset.size).toBe("sm");

            expect(innerCard?.style.getPropertyValue("--cs-card-nested-radius")).toBe("10px");
            expect(deepCard?.style.getPropertyValue("--cs-card-nested-radius")).toBe("8px");

            expect(innerProbe?.dataset.ctxVariant).toBe("soft");
            expect(innerProbe?.dataset.ctxSize).toBe("sm");
            expect(innerProbe?.dataset.ctxOrientation).toBe("vertical");
            expect(innerMedia?.dataset.placement).toBe("top");
            expect(innerClose?.dataset.size).toBe("xs");

            // Mutate inner Card: inner subcomponents update without leaking into outer or deep context
            innerVariant = "elevated";
            innerSize = "lg";
            innerOrientation = "horizontal";
            flushSync();

            expect(innerProbe?.dataset.ctxVariant).toBe("elevated");
            expect(innerProbe?.dataset.ctxSize).toBe("lg");
            expect(innerProbe?.dataset.ctxOrientation).toBe("horizontal");
            expect(innerMedia?.dataset.placement).toBe("start");
            expect(innerClose?.dataset.size).toBe("md");

            expect(outerProbe?.dataset.ctxVariant).toBe("transparent");
            expect(outerProbe?.dataset.ctxSize).toBe("md");
            expect(outerProbe?.dataset.ctxOrientation).toBe("vertical");
            expect(outerMedia?.dataset.placement).toBe("top");
            expect(outerClose?.dataset.size).toBe("sm");

            expect(deepProbe?.dataset.ctxVariant).toBe("sunken");
            expect(deepProbe?.dataset.ctxSize).toBe("sm");
            expect(deepProbe?.dataset.ctxOrientation).toBe("horizontal");
            expect(deepMedia?.dataset.placement).toBe("start");
            expect(deepClose?.dataset.size).toBe("xs");

            // Mutate deepest Card without leaking upward
            deepVariant = "soft";
            deepSize = "md";
            deepOrientation = "vertical";
            flushSync();

            expect(deepProbe?.dataset.ctxVariant).toBe("soft");
            expect(deepProbe?.dataset.ctxSize).toBe("md");
            expect(deepProbe?.dataset.ctxOrientation).toBe("vertical");
            expect(deepMedia?.dataset.placement).toBe("top");
            expect(deepClose?.dataset.size).toBe("sm");

            expect(innerProbe?.dataset.ctxSize).toBe("lg");
            expect(innerMedia?.dataset.placement).toBe("start");

            unmount(instance);
        });
    });

    describe("Subcomponent semantics & attributes", () => {
        test("CardTitle defaults to <h3> and supports all 'as' elements, ref, class, and rest props", () => {
            let as = $state<CardTitleElement | undefined>(undefined);
            let titleRef: HTMLHeadingElement | HTMLDivElement | null = null;

            const instance = mount(CardTitle, {
                target: container,
                props: {
                    get as() {
                        return as;
                    },
                    class: "custom-title",
                    id: "title-1",
                    "data-testid": "card-title",
                    get ref() {
                        return titleRef;
                    },
                    set ref(el: HTMLHeadingElement | HTMLDivElement | null) {
                        titleRef = el;
                    },
                },
            });
            flushSync();

            let el = container.querySelector<HTMLElement>(".cs-card-title");
            expect(el).not.toBeNull();
            expect(el?.tagName).toBe("H3");
            expect(el?.classList.contains("custom-title")).toBe(true);
            expect(el?.getAttribute("id")).toBe("title-1");
            expect(el?.dataset.testid).toBe("card-title");
            expect(titleRef).toBe(el);

            for (const tag of CARD_TITLE_ELEMENTS) {
                as = tag;
                flushSync();
                el = container.querySelector<HTMLElement>(".cs-card-title");
                expect(el?.tagName).toBe(tag.toUpperCase());
                expect(titleRef).toBe(el);
            }

            unmount(instance);
            expect(titleRef).toBeNull();
        });

        test("CardDescription renders <p> with .cs-card-description, ref, and rest attributes", () => {
            let ref: HTMLParagraphElement | null = null;

            const instance = mount(CardDescription, {
                target: container,
                props: {
                    class: "custom-desc",
                    id: "desc-1",
                    get ref() {
                        return ref;
                    },
                    set ref(el: HTMLParagraphElement | null) {
                        ref = el;
                    },
                },
            });
            flushSync();

            const desc = container.querySelector<HTMLParagraphElement>("p.cs-card-description");
            expect(desc).not.toBeNull();
            expect(desc?.tagName).toBe("P");
            expect(desc?.classList.contains("custom-desc")).toBe(true);
            expect(desc?.getAttribute("id")).toBe("desc-1");
            expect(ref).toBe(desc);

            unmount(instance);
            expect(ref).toBeNull();
        });

        test("CardHeader, CardBody, and CardFooter render divs with canonical classes, refs, and rest props", () => {
            let headerRef: HTMLDivElement | null = null;
            let bodyRef: HTMLDivElement | null = null;
            let footerRef: HTMLDivElement | null = null;

            const instance = mount(CardTestHost, {
                target: container,
                props: {
                    showHeader: true,
                    showBody: true,
                    showFooter: true,
                    headerClass: "h-extra",
                    headerAttrs: { "data-testid": "hdr" },
                    bodyClass: "b-extra",
                    bodyAttrs: { "data-testid": "bdy" },
                    footerClass: "f-extra",
                    footerAttrs: { "data-testid": "ftr" },
                    get headerRef() {
                        return headerRef;
                    },
                    set headerRef(el: HTMLDivElement | null) {
                        headerRef = el;
                    },
                    get bodyRef() {
                        return bodyRef;
                    },
                    set bodyRef(el: HTMLDivElement | null) {
                        bodyRef = el;
                    },
                    get footerRef() {
                        return footerRef;
                    },
                    set footerRef(el: HTMLDivElement | null) {
                        footerRef = el;
                    },
                },
            });
            flushSync();

            const header = container.querySelector<HTMLDivElement>("div.cs-card-header");
            const body = container.querySelector<HTMLDivElement>("div.cs-card-body");
            const footer = container.querySelector<HTMLDivElement>("div.cs-card-footer");

            expect(header).not.toBeNull();
            expect(header?.classList.contains("h-extra")).toBe(true);
            expect(header?.dataset.testid).toBe("hdr");
            expect(headerRef).toBe(header);

            expect(body).not.toBeNull();
            expect(body?.classList.contains("b-extra")).toBe(true);
            expect(body?.dataset.testid).toBe("bdy");
            expect(bodyRef).toBe(body);

            expect(footer).not.toBeNull();
            expect(footer?.classList.contains("f-extra")).toBe(true);
            expect(footer?.dataset.testid).toBe("ftr");
            expect(footerRef).toBe(footer);

            unmount(instance);
            expect(headerRef).toBeNull();
            expect(bodyRef).toBeNull();
            expect(footerRef).toBeNull();
        });

        test("CardActions sets default and explicit data-align and data-orientation", () => {
            let align = $state<CardActionsAlign | undefined>(undefined);
            let orientation = $state<CardActionsOrientation | undefined>(undefined);
            let ref: HTMLDivElement | null = null;

            const instance = mount(CardActions, {
                target: container,
                props: {
                    get align() {
                        return align;
                    },
                    get orientation() {
                        return orientation;
                    },
                    class: "custom-actions",
                    "data-testid": "actions",
                    get ref() {
                        return ref;
                    },
                    set ref(el: HTMLDivElement | null) {
                        ref = el;
                    },
                },
            });
            flushSync();

            const actions = container.querySelector<HTMLDivElement>("div.cs-card-actions");
            expect(actions).not.toBeNull();
            expect(actions?.classList.contains("custom-actions")).toBe(true);
            expect(actions?.dataset.testid).toBe("actions");
            expect(actions?.dataset.align).toBe("end");
            expect(actions?.dataset.orientation).toBe("horizontal");
            expect(ref).toBe(actions);

            for (const nextAlign of CARD_ACTIONS_ALIGNS) {
                align = nextAlign;
                flushSync();
                expect(actions?.dataset.align).toBe(nextAlign);
            }

            for (const nextOrientation of CARD_ACTIONS_ORIENTATIONS) {
                orientation = nextOrientation;
                flushSync();
                expect(actions?.dataset.orientation).toBe(nextOrientation);
            }

            unmount(instance);
            expect(ref).toBeNull();
        });

        test("CardMedia sets data-placement, data-fit, data-bleed, data-ratio, and --cs-card-media-ratio style", () => {
            let placement = $state<CardMediaPlacement | undefined>(undefined);
            let fit = $state<CardMediaFit | undefined>(undefined);
            let ratio = $state<CardMediaRatio | undefined>(undefined);
            let bleed = $state<boolean | undefined>(undefined);
            let ref: HTMLDivElement | null = null;

            const instance = mount(CardMedia, {
                target: container,
                props: {
                    get placement() {
                        return placement;
                    },
                    get fit() {
                        return fit;
                    },
                    get ratio() {
                        return ratio;
                    },
                    get bleed() {
                        return bleed;
                    },
                    class: "custom-media",
                    "data-testid": "media",
                    get ref() {
                        return ref;
                    },
                    set ref(el: HTMLDivElement | null) {
                        ref = el;
                    },
                },
            });
            flushSync();

            const media = container.querySelector<HTMLDivElement>("div.cs-card-media");
            expect(media).not.toBeNull();
            expect(media?.classList.contains("custom-media")).toBe(true);
            expect(media?.dataset.testid).toBe("media");
            expect(media?.dataset.placement).toBe("top");
            expect(media?.dataset.fit).toBe("cover");
            expect(media?.dataset.ratio).toBe("auto");
            expect(media?.hasAttribute("data-bleed")).toBe(false);
            expect(media?.style.getPropertyValue("--cs-card-media-ratio")).toBe("");
            expect(ref).toBe(media);

            for (const nextPlacement of CARD_MEDIA_PLACEMENTS) {
                placement = nextPlacement;
                flushSync();
                expect(media?.dataset.placement).toBe(nextPlacement);
            }

            for (const nextFit of CARD_MEDIA_FITS) {
                fit = nextFit;
                flushSync();
                expect(media?.dataset.fit).toBe(nextFit);
            }

            // Non-auto ratio clears data-ratio="auto" and sets CSS custom property for aspect-ratio
            for (const nextRatio of ["1/1", "4/3", "16/9", "21/9", "3/2"] as const) {
                ratio = nextRatio;
                flushSync();
                expect(media?.hasAttribute("data-ratio")).toBe(false);
                expect(media?.style.getPropertyValue("--cs-card-media-ratio")).toBe(nextRatio);
            }

            // Switching back to "auto" restores data-ratio="auto" and clears custom property
            ratio = "auto";
            flushSync();
            expect(media?.dataset.ratio).toBe("auto");
            expect(media?.style.getPropertyValue("--cs-card-media-ratio")).toBe("");

            // Bleed toggle
            bleed = true;
            flushSync();
            expect(media?.dataset.bleed).toBe("");

            bleed = false;
            flushSync();
            expect(media?.hasAttribute("data-bleed")).toBe(false);

            unmount(instance);
            expect(ref).toBeNull();
        });

        test("CardRail sets data-variant, data-placement, data-columns, ref, and rest props", () => {
            let variant = $state<CardRailVariant>("sunken");
            let placement = $state<CardRailPlacement | undefined>(undefined);
            let columns = $state<CardRailColumns | undefined>(undefined);
            let ref: HTMLDivElement | null = null;

            const instance = mount(CardRail, {
                target: container,
                props: {
                    get variant() {
                        return variant;
                    },
                    get placement() {
                        return placement;
                    },
                    get columns() {
                        return columns;
                    },
                    class: "custom-rail",
                    "data-testid": "rail",
                    get ref() {
                        return ref;
                    },
                    set ref(el: HTMLDivElement | null) {
                        ref = el;
                    },
                },
            });
            flushSync();

            const rail = container.querySelector<HTMLDivElement>("div.cs-card-rail");
            expect(rail).not.toBeNull();
            expect(rail?.classList.contains("custom-rail")).toBe(true);
            expect(rail?.dataset.testid).toBe("rail");
            expect(rail?.dataset.variant).toBe("sunken");
            expect(rail?.dataset.placement).toBe("end");
            expect(rail?.dataset.columns).toBe("1");
            expect(ref).toBe(rail);

            for (const nextVariant of CARD_RAIL_VARIANTS) {
                variant = nextVariant;
                flushSync();
                expect(rail?.dataset.variant).toBe(nextVariant);
            }

            for (const nextPlacement of CARD_RAIL_PLACEMENTS) {
                placement = nextPlacement;
                flushSync();
                expect(rail?.dataset.placement).toBe(nextPlacement);
            }

            for (const nextColumns of CARD_RAIL_COLUMNS) {
                columns = nextColumns;
                flushSync();
                expect(rail?.dataset.columns).toBe(String(nextColumns));
            }

            unmount(instance);
            expect(ref).toBeNull();
        });

        test("CardOrnament sets aria-hidden='true', data-placement, data-shape, ref, and rest props", () => {
            let placement = $state<CardOrnamentPlacement | undefined>(undefined);
            let shape = $state<CardOrnamentShape | undefined>(undefined);
            let ref: HTMLDivElement | null = null;

            const instance = mount(CardOrnament, {
                target: container,
                props: {
                    get placement() {
                        return placement;
                    },
                    get shape() {
                        return shape;
                    },
                    class: "custom-ornament",
                    "data-testid": "ornament",
                    get ref() {
                        return ref;
                    },
                    set ref(el: HTMLDivElement | null) {
                        ref = el;
                    },
                },
            });
            flushSync();

            const ornament = container.querySelector<HTMLDivElement>("div.cs-card-ornament");
            expect(ornament).not.toBeNull();
            expect(ornament?.getAttribute("aria-hidden")).toBe("true");
            expect(ornament?.classList.contains("custom-ornament")).toBe(true);
            expect(ornament?.dataset.testid).toBe("ornament");
            expect(ornament?.dataset.placement).toBe("bottom-left");
            expect(ornament?.dataset.shape).toBe("none");
            expect(ref).toBe(ornament);

            for (const nextPlacement of CARD_ORNAMENT_PLACEMENTS) {
                placement = nextPlacement;
                flushSync();
                expect(ornament?.dataset.placement).toBe(nextPlacement);
            }

            for (const nextShape of CARD_ORNAMENT_SHAPES) {
                shape = nextShape;
                flushSync();
                expect(ornament?.dataset.shape).toBe(nextShape);
            }

            unmount(instance);
            expect(ref).toBeNull();
        });

        test("CardClose renders CloseButton with .cs-card-close, handles onclick and disabled, and preserves ref", () => {
            let variant = $state<CloseButtonVariant>("soft");
            let disabled = $state(false);
            let ref: HTMLButtonElement | null = null;
            const onClick = vi.fn();

            const instance = mount(CardClose, {
                target: container,
                props: {
                    get variant() {
                        return variant;
                    },
                    get disabled() {
                        return disabled;
                    },
                    class: "custom-close",
                    "data-testid": "card-close",
                    onclick: onClick,
                    get ref() {
                        return ref;
                    },
                    set ref(el: HTMLButtonElement | null) {
                        ref = el;
                    },
                },
            });
            flushSync();

            const btn = container.querySelector<HTMLButtonElement>("button.cs-card-close");
            expect(btn).not.toBeNull();
            expect(btn?.tagName).toBe("BUTTON");
            expect(btn?.getAttribute("type")).toBe("button");
            expect(btn?.classList.contains("cs-close-button")).toBe(true);
            expect(btn?.classList.contains("cs-card-close")).toBe(true);
            expect(btn?.classList.contains("custom-close")).toBe(true);
            expect(btn?.dataset.variant).toBe("soft");
            expect(btn?.dataset.testid).toBe("card-close");
            expect(btn?.getAttribute("aria-label")).toBeTruthy();
            expect(btn?.querySelector(".cs-hit-area")).not.toBeNull();
            expect(ref).toBe(btn);

            btn?.click();
            flushSync();
            expect(onClick).toHaveBeenCalledTimes(1);

            // Disabled prevents click
            disabled = true;
            variant = "ghost";
            flushSync();
            expect(btn?.disabled).toBe(true);
            expect(btn?.dataset.variant).toBe("ghost");

            btn?.click();
            flushSync();
            expect(onClick).toHaveBeenCalledTimes(1);

            // Re-enabling restores click
            disabled = false;
            flushSync();
            expect(btn?.disabled).toBe(false);
            btn?.click();
            flushSync();
            expect(onClick).toHaveBeenCalledTimes(2);

            unmount(instance);
            expect(ref).toBeNull();
        });

        test("CardClose forwards custom aria-label via rest props to override the default localized label", () => {
            const defaultInstance = mount(CardClose, {
                target: container,
                props: {
                    variant: "soft",
                    "data-testid": "default-close",
                },
            });
            flushSync();

            const defaultBtn = container.querySelector<HTMLButtonElement>('[data-testid="default-close"]');
            const defaultLabel = defaultBtn?.getAttribute("aria-label");
            expect(defaultLabel).toBeTruthy();

            const customInstance = mount(CardClose, {
                target: container,
                props: {
                    variant: "soft",
                    "aria-label": "Dismiss card notice",
                    "data-testid": "custom-close",
                },
            });
            flushSync();

            const customBtn = container.querySelector<HTMLButtonElement>('[data-testid="custom-close"]');
            expect(customBtn?.getAttribute("aria-label")).toBe("Dismiss card notice");
            expect(customBtn?.getAttribute("aria-label")).not.toBe(defaultLabel);

            unmount(customInstance);
            unmount(defaultInstance);
        });
    });

    describe("Composition & edge cases", () => {
        test("minimal room-tile composition (CardHeader + CardOrnament + CardRail, no CardBody or CardFooter)", () => {
            const instance = mount(CardTestHost, {
                target: container,
                props: {
                    variant: "elevated",
                    size: "sm",
                    orientation: "horizontal",
                    showHeader: true,
                    titleText: "Living Room",
                    descriptionText: "21.5 °C · 2 lights on",
                    showOrnament: true,
                    ornamentPlacement: "bottom-left",
                    ornamentShape: "circle",
                    showRail: true,
                    railVariant: "sunken",
                    railColumns: 1,
                    showBody: false,
                    showFooter: false,
                    showMedia: false,
                    showClose: false,
                },
            });
            flushSync();

            const card = container.querySelector<HTMLDivElement>(".cs-card");
            expect(card?.dataset.variant).toBe("elevated");
            expect(card?.dataset.size).toBe("sm");
            expect(card?.dataset.orientation).toBe("horizontal");

            expect(card?.querySelector(":scope .cs-card-header .cs-card-title")?.textContent?.trim()).toBe(
                "Living Room"
            );
            expect(card?.querySelector(":scope .cs-card-header .cs-card-description")?.textContent?.trim()).toBe(
                "21.5 °C · 2 lights on"
            );

            const ornament = card?.querySelector<HTMLDivElement>(".cs-card-ornament");
            expect(ornament?.getAttribute("aria-hidden")).toBe("true");
            expect(ornament?.dataset.placement).toBe("bottom-left");
            expect(ornament?.dataset.shape).toBe("circle");

            const rail = card?.querySelector<HTMLDivElement>(".cs-card-rail");
            expect(rail?.dataset.variant).toBe("sunken");
            expect(rail?.dataset.placement).toBe("end");
            expect(rail?.dataset.columns).toBe("1");

            expect(card?.querySelector(".cs-card-body")).toBeNull();
            expect(card?.querySelector(".cs-card-footer")).toBeNull();

            unmount(instance);
        });

        test("horizontal promo composition (CardMedia + CardHeader + CardFooter + CardActions + CardClose)", () => {
            const onCloseClick = vi.fn();

            const instance = mount(CardTestHost, {
                target: container,
                props: {
                    variant: "elevated",
                    size: "md",
                    orientation: "horizontal",
                    showMedia: true,
                    mediaRatio: "1/1",
                    showHeader: true,
                    titleText: "Workspace Sync",
                    descriptionText: "Keep local scripts aligned across machines.",
                    showFooter: true,
                    footerMeta: "v2.4",
                    showActions: true,
                    actionsAlign: "end",
                    showClose: true,
                    closeVariant: "soft",
                    onCloseClick,
                },
            });
            flushSync();

            const card = container.querySelector<HTMLDivElement>(".cs-card");
            expect(card?.dataset.orientation).toBe("horizontal");

            const media = card?.querySelector<HTMLDivElement>(".cs-card-media");
            expect(media?.dataset.placement).toBe("start");
            expect(media?.style.getPropertyValue("--cs-card-media-ratio")).toBe("1/1");

            expect(card?.querySelector(".cs-card-header")).not.toBeNull();
            const footer = card?.querySelector<HTMLDivElement>(".cs-card-footer");
            expect(footer?.querySelector('[data-testid="footer-meta"]')?.textContent).toBe("v2.4");

            const actions = footer?.querySelector<HTMLDivElement>(".cs-card-actions");
            expect(actions?.dataset.align).toBe("end");

            const closeBtn = card?.querySelector<HTMLButtonElement>("button.cs-card-close");
            expect(closeBtn?.dataset.variant).toBe("soft");
            expect(closeBtn?.dataset.size).toBe("sm");
            closeBtn?.click();
            flushSync();
            expect(onCloseClick).toHaveBeenCalledTimes(1);

            unmount(instance);
        });

        test("raw children directly inside Card alongside subcomponents", () => {
            const instance = mount(CardTestHost, {
                target: container,
                props: {
                    variant: "soft",
                    size: "md",
                    showHeader: true,
                    showRawChild: true,
                    rawChildText: "Direct telemetry slider",
                    showFooter: true,
                    showBody: false,
                },
            });
            flushSync();

            const card = container.querySelector<HTMLDivElement>(".cs-card");
            const rawChild = card?.querySelector<HTMLDivElement>('[data-testid="raw-child"]');
            expect(rawChild).not.toBeNull();
            expect(rawChild?.parentElement).toBe(card);
            expect(rawChild?.textContent).toBe("Direct telemetry slider");
            expect(card?.querySelector(".cs-card-header")).not.toBeNull();
            expect(card?.querySelector(".cs-card-footer")).not.toBeNull();

            unmount(instance);
        });

        test("dynamic mount/unmount of subcomponents inside Card preserves sibling refs and context sync", () => {
            let size = $state<CardSize>("sm");
            let orientation = $state<CardOrientation>("vertical");
            let showMedia = $state(false);
            let showClose = $state(false);
            let showRail = $state(true);

            const refs: {
                card: HTMLDivElement | null;
                media: HTMLDivElement | null;
                close: HTMLButtonElement | null;
                rail: HTMLDivElement | null;
            } = {
                card: null,
                media: null,
                close: null,
                rail: null,
            };

            const instance = mount(CardTestHost, {
                target: container,
                props: {
                    variant: "elevated",
                    get size() {
                        return size;
                    },
                    get orientation() {
                        return orientation;
                    },
                    get showMedia() {
                        return showMedia;
                    },
                    get showClose() {
                        return showClose;
                    },
                    get showRail() {
                        return showRail;
                    },
                    get cardRef() {
                        return refs.card;
                    },
                    set cardRef(el: HTMLDivElement | null) {
                        refs.card = el;
                    },
                    get mediaRef() {
                        return refs.media;
                    },
                    set mediaRef(el: HTMLDivElement | null) {
                        refs.media = el;
                    },
                    get closeRef() {
                        return refs.close;
                    },
                    set closeRef(el: HTMLButtonElement | null) {
                        refs.close = el;
                    },
                    get railRef() {
                        return refs.rail;
                    },
                    set railRef(el: HTMLDivElement | null) {
                        refs.rail = el;
                    },
                },
            });
            flushSync();

            const initialCard = refs.card;
            expect(initialCard).not.toBeNull();
            expect(refs.media).toBeNull();
            expect(refs.close).toBeNull();
            expect(refs.rail).not.toBeNull();

            // Mutate Card context while media & close are unmounted, then mount them
            orientation = "horizontal";
            size = "lg";
            showMedia = true;
            showClose = true;
            flushSync();

            expect(refs.card).toBe(initialCard);
            expect(refs.media?.dataset.placement).toBe("start");
            expect(refs.close?.dataset.size).toBe("md");
            expect(refs.rail).not.toBeNull();

            // Unmount rail & media; close remains synced to Card size
            showRail = false;
            showMedia = false;
            size = "md";
            flushSync();

            expect(refs.rail).toBeNull();
            expect(refs.media).toBeNull();
            expect(refs.close?.dataset.size).toBe("sm");

            unmount(instance);
            expect(refs.card).toBeNull();
            expect(refs.close).toBeNull();
        });

        test("preserves canonical DOM Tab order and bare CardTitle structure when CardClose is placed first", () => {
            const canonicalInstance = mount(CardTestHost, {
                target: container,
                props: {
                    variant: "elevated",
                    size: "md",
                    showHeader: true,
                    showHeaderControl: true,
                    showClose: true,
                    closePosition: "after-header",
                    showBody: true,
                    showBodyControl: true,
                    showFooter: true,
                    showActions: true,
                },
            });
            flushSync();

            const canonicalCard = container.querySelector<HTMLDivElement>(".cs-card");
            expect(canonicalCard).not.toBeNull();

            const focusableButtons = [...(canonicalCard?.querySelectorAll<HTMLButtonElement>("button") ?? [])];
            const headerControl = canonicalCard?.querySelector<HTMLButtonElement>('[data-testid="header-control"]');
            const closeBtn = canonicalCard?.querySelector<HTMLButtonElement>("button.cs-card-close");
            const bodyControl = canonicalCard?.querySelector<HTMLButtonElement>('[data-testid="body-control"]');
            const footerButtons = [
                ...(canonicalCard?.querySelectorAll<HTMLButtonElement>(
                    ":scope .cs-card-footer .cs-card-actions button"
                ) ?? []),
            ];

            expect(headerControl).not.toBeNull();
            expect(closeBtn).not.toBeNull();
            expect(bodyControl).not.toBeNull();
            expect(footerButtons).toHaveLength(2);
            expect(focusableButtons).toEqual([headerControl, closeBtn, bodyControl, ...footerButtons]);
            for (const btn of focusableButtons) {
                expect(btn.tabIndex).toBe(0);
            }

            unmount(canonicalInstance);

            const bareInstance = mount(CardTestHost, {
                target: container,
                props: {
                    variant: "elevated",
                    size: "md",
                    showHeader: false,
                    showBareTitle: true,
                    titleText: "Bare Title",
                    showClose: true,
                    closePosition: "first",
                    showBody: true,
                },
            });
            flushSync();

            const bareCard = container.querySelector<HTMLDivElement>(".cs-card");
            expect(bareCard).not.toBeNull();
            expect(bareCard?.querySelector(".cs-card-header")).toBeNull();

            const children = [...(bareCard?.children ?? [])];
            const bareClose = bareCard?.querySelector<HTMLButtonElement>("button.cs-card-close");
            const bareTitle = bareCard?.querySelector<HTMLHeadingElement>(".cs-card-title");
            const bareBody = bareCard?.querySelector<HTMLDivElement>(".cs-card-body");

            expect(bareClose).not.toBeNull();
            expect(bareTitle).not.toBeNull();
            expect(bareBody).not.toBeNull();
            expect(children).toEqual([bareClose, bareTitle, bareBody]);
            expect(bareTitle?.textContent?.trim()).toBe("Bare Title");
            expect(bareTitle?.matches(".cs-card-title:first-of-type")).toBe(true);
            expect(bareTitle?.matches(".cs-card-title:first-child")).toBe(false);

            unmount(bareInstance);
        });
    });
});
