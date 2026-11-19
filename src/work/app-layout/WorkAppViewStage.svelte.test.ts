import { flushSync, mount, unmount } from "svelte";
import { cubicIn, cubicOut, linear, quadIn, quartOut } from "svelte/easing";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import WorkAppViewStageTestHost from "./WorkAppViewStageTestHost.internal.svelte";
import { type WorkAppViewKey, workAppViewIn, workAppViewOut } from "./index.ts";

function mockReducedMotion(matches: boolean): ReturnType<typeof vi.spyOn> {
    return vi.spyOn(window, "matchMedia").mockImplementation(
        (query: string) =>
            ({
                matches: query === "(prefers-reduced-motion: reduce)" ? matches : false,
                media: query,
                onchange: null,
                addListener: vi.fn(),
                removeListener: vi.fn(),
                addEventListener: vi.fn(),
                removeEventListener: vi.fn(),
                dispatchEvent: vi.fn(),
            }) as MediaQueryList,
    );
}

function attachScrollStub(el: HTMLElement): ReturnType<typeof vi.fn> {
    let topValue = 0;
    Object.defineProperty(el, "scrollTop", {
        configurable: true,
        get: () => topValue,
        set: (value: number) => {
            topValue = value;
        },
    });

    const scrollToSpy = vi.fn((options?: ScrollToOptions | number, y?: number) => {
        if (typeof options === "object" && options !== null) {
            if (typeof options.top === "number") {
                topValue = options.top;
            }
        } else if (typeof y === "number") {
            topValue = y;
        }
    });

    Object.defineProperty(el, "scrollTo", {
        configurable: true,
        value: scrollToSpy,
    });

    return scrollToSpy;
}

describe("work-app-view-transition", () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    test("axis 'y' defaults use expected timing, easing, and translate3d + scale css", () => {
        mockReducedMotion(false);
        const node = document.createElement("div");

        const outConfig = workAppViewOut(node);
        expect(outConfig.duration).toBe(110);
        expect(outConfig.delay).toBe(0);
        expect(outConfig.easing).toBe(cubicIn);
        expect(outConfig.css?.(1, 0)).toBe("opacity: 1; transform: translate3d(0, 0px, 0) scale(1);");
        expect(outConfig.css?.(0.5, 0.5)).toBe("opacity: 0.5; transform: translate3d(0, -3px, 0) scale(0.998);");
        expect(outConfig.css?.(0, 1)).toBe("opacity: 0; transform: translate3d(0, -6px, 0) scale(0.996);");

        const inConfig = workAppViewIn(node);
        expect(inConfig.duration).toBe(220);
        expect(inConfig.delay).toBe(70);
        expect(inConfig.easing).toBe(quartOut);
        expect(inConfig.css?.(0, 1)).toBe("opacity: 0; transform: translate3d(0, 10px, 0) scale(0.994);");
        expect(inConfig.css?.(0.5, 0.5)).toBe("opacity: 0.5; transform: translate3d(0, 5px, 0) scale(0.997);");
        expect(inConfig.css?.(1, 0)).toBe("opacity: 1; transform: translate3d(0, 0px, 0) scale(1);");
    });

    test("axis 'x' defaults use expected timing, direction, and translate3d without scale", () => {
        mockReducedMotion(false);
        const node = document.createElement("div");

        const outForward = workAppViewOut(node, { axis: "x", direction: 1 });
        expect(outForward.duration).toBe(100);
        expect(outForward.delay).toBe(0);
        expect(outForward.easing).toBe(quadIn);
        expect(outForward.css?.(0, 1)).toBe("opacity: 0; transform: translate3d(-12px, 0, 0);");
        expect(outForward.css?.(0.5, 0.5)).not.toContain("scale");

        const outBackward = workAppViewOut(node, { axis: "x", direction: -1 });
        expect(outBackward.css?.(0, 1)).toBe("opacity: 0; transform: translate3d(12px, 0, 0);");

        const inForward = workAppViewIn(node, { axis: "x", direction: 1 });
        expect(inForward.duration).toBe(180);
        expect(inForward.delay).toBe(60);
        expect(inForward.easing).toBe(cubicOut);
        expect(inForward.css?.(0, 1)).toBe("opacity: 0; transform: translate3d(16px, 0, 0);");
        expect(inForward.css?.(1, 0)).toBe("opacity: 1; transform: translate3d(0px, 0, 0);");
        expect(inForward.css?.(0.5, 0.5)).not.toContain("scale");

        const inBackward = workAppViewIn(node, { axis: "x", direction: -1 });
        expect(inBackward.css?.(0, 1)).toBe("opacity: 0; transform: translate3d(-16px, 0, 0);");
    });

    test("respects custom distance, duration, delay, and easing overrides", () => {
        mockReducedMotion(false);
        const node = document.createElement("div");

        const inCustom = workAppViewIn(node, {
            axis: "x",
            direction: -1,
            distance: 24,
            duration: 300,
            delay: 40,
            easing: linear,
        });
        expect(inCustom.duration).toBe(300);
        expect(inCustom.delay).toBe(40);
        expect(inCustom.easing).toBe(linear);
        expect(inCustom.css?.(0, 1)).toBe("opacity: 0; transform: translate3d(-24px, 0, 0);");
    });

    test("prefers-reduced-motion returns zero duration and delay", () => {
        mockReducedMotion(true);
        const node = document.createElement("div");

        expect(workAppViewOut(node)).toEqual({ duration: 0, delay: 0 });
        expect(workAppViewIn(node)).toEqual({ duration: 0, delay: 0 });
    });

    test("workAppViewOut sets exit locks and workAppViewIn clears them (even with reduced motion)", () => {
        const reducedMotionSpy = mockReducedMotion(false);
        const node = document.createElement("div");

        workAppViewOut(node);
        node.style.translate = "0 -420px";
        expect(node.inert).toBe(true);
        expect(node.style.pointerEvents).toBe("none");
        expect(node.dataset.exiting).toBe("");

        workAppViewIn(node);
        expect(node.inert).toBe(false);
        expect(node.style.pointerEvents).toBe("");
        expect(node.style.translate).toBe("");
        expect(node.dataset.exiting).toBeUndefined();
        expect("exiting" in node.dataset).toBe(false);

        reducedMotionSpy.mockRestore();
        mockReducedMotion(true);

        workAppViewOut(node);
        expect(node.inert).toBe(true);
        expect(node.style.pointerEvents).toBe("none");
        expect(node.dataset.exiting).toBe("");

        workAppViewIn(node);
        expect(node.inert).toBe(false);
        expect(node.style.pointerEvents).toBe("");
        expect(node.dataset.exiting).toBeUndefined();
    });
});

describe("WorkAppViewStage", () => {
    let container: HTMLDivElement;
    const instances: Array<Record<string, unknown>> = [];

    beforeEach(() => {
        container = document.createElement("div");
        document.body.append(container);
    });

    afterEach(() => {
        for (const instance of instances) {
            unmount(instance);
        }
        instances.length = 0;
        container.remove();
        vi.restoreAllMocks();
    });

    test("renders .cs-work-app-view-stage, exposes ref, and forwards class and rest attributes", () => {
        const props = $state({
            activeKey: "app" as WorkAppViewKey | undefined,
            stageRef: null as HTMLElement | null,
            stageClass: "custom-stage",
            stageTestId: "view-stage",
            stageId: "stage-root",
        });

        const instance = mount(WorkAppViewStageTestHost, {
            target: container,
            props,
        });
        instances.push(instance);
        flushSync();

        const stageEl = container.querySelector<HTMLElement>(".cs-work-app-view-stage");
        expect(stageEl).not.toBeNull();
        expect(props.stageRef).toBe(stageEl);
        expect(stageEl?.classList.contains("cs-work-app-view-stage")).toBe(true);
        expect(stageEl?.classList.contains("custom-stage")).toBe(true);
        expect(stageEl?.dataset.testid).toBe("view-stage");
        expect(stageEl?.id).toBe("stage-root");
        expect(stageEl?.dataset.activeKey).toBe("app");

        props.activeKey = undefined;
        flushSync();
        expect(stageEl?.dataset.activeKey).toBeUndefined();
    });

    test("saves and restores per-view scroll positions in RAM across view switches", () => {
        const scroller = document.createElement("div");
        const scrollToSpy = attachScrollStub(scroller);

        const props = $state({
            activeKey: "app" as WorkAppViewKey | undefined,
            scrollContainer: scroller as HTMLElement | Window | null | undefined,
            restoreScroll: true,
        });

        const instance = mount(WorkAppViewStageTestHost, {
            target: container,
            props,
        });
        instances.push(instance);
        flushSync();

        // No spurious scroll reset on initial mount
        expect(scrollToSpy).not.toHaveBeenCalled();

        // Scroll "app" to 420 and switch to "docs" -> restores 0
        scroller.scrollTop = 420;
        props.activeKey = "docs";
        flushSync();

        expect(scrollToSpy).toHaveBeenCalledTimes(1);
        expect(scrollToSpy).toHaveBeenLastCalledWith({ top: 0, behavior: "instant" });
        expect(scroller.scrollTop).toBe(0);

        // Scroll "docs" to 180 and switch back to "app" -> restores 420
        scroller.scrollTop = 180;
        props.activeKey = "app";
        flushSync();

        expect(scrollToSpy).toHaveBeenCalledTimes(2);
        expect(scrollToSpy).toHaveBeenLastCalledWith({ top: 420, behavior: "instant" });
        expect(scroller.scrollTop).toBe(420);

        // Switching back to "docs" restores 180
        props.activeKey = "docs";
        flushSync();

        expect(scrollToSpy).toHaveBeenCalledTimes(3);
        expect(scrollToSpy).toHaveBeenLastCalledWith({ top: 180, behavior: "instant" });
        expect(scroller.scrollTop).toBe(180);

        // No-op re-assignment of same key does not re-trigger scrollTo
        props.activeKey = "docs";
        flushSync();
        expect(scrollToSpy).toHaveBeenCalledTimes(3);
    });

    test("restoreScroll={false} skips saving and restoring scroll", () => {
        const scroller = document.createElement("div");
        const scrollToSpy = attachScrollStub(scroller);

        const props = $state({
            activeKey: "app" as WorkAppViewKey | undefined,
            scrollContainer: scroller as HTMLElement | Window | null | undefined,
            restoreScroll: false,
        });

        const instance = mount(WorkAppViewStageTestHost, {
            target: container,
            props,
        });
        instances.push(instance);
        flushSync();

        scroller.scrollTop = 420;
        props.activeKey = "docs";
        flushSync();

        expect(scrollToSpy).not.toHaveBeenCalled();
        expect(scroller.scrollTop).toBe(420);

        // Even if re-enabled later, "app" was never saved while restoreScroll was false
        props.restoreScroll = true;
        scroller.scrollTop = 180;
        props.activeKey = "app";
        flushSync();

        expect(scrollToSpy).toHaveBeenCalledTimes(1);
        expect(scrollToSpy).toHaveBeenLastCalledWith({ top: 0, behavior: "instant" });
    });

    test("auto-resolves .cs-scroll-area-content ancestor when scrollContainer is omitted", () => {
        const props = $state({
            activeKey: "app" as WorkAppViewKey | undefined,
            withScrollAreaAncestor: true,
            scrollAreaRef: null as HTMLElement | null,
        });

        const instance = mount(WorkAppViewStageTestHost, {
            target: container,
            props,
        });
        instances.push(instance);
        flushSync();

        const scrollAreaEl = props.scrollAreaRef;
        expect(scrollAreaEl).not.toBeNull();
        expect(scrollAreaEl?.classList.contains("cs-scroll-area-content")).toBe(true);

        const scrollToSpy = attachScrollStub(scrollAreaEl as HTMLElement);

        (scrollAreaEl as HTMLElement).scrollTop = 310;
        props.activeKey = "docs";
        flushSync();

        expect(scrollToSpy).toHaveBeenCalledTimes(1);
        expect(scrollToSpy).toHaveBeenLastCalledWith({ top: 0, behavior: "instant" });

        (scrollAreaEl as HTMLElement).scrollTop = 95;
        props.activeKey = "app";
        flushSync();

        expect(scrollToSpy).toHaveBeenCalledTimes(2);
        expect(scrollToSpy).toHaveBeenLastCalledWith({ top: 310, behavior: "instant" });
    });

    test("pixel-locks outgoing view via style.translate on scroll delta and clears it on workAppViewIn", () => {
        mockReducedMotion(false);
        vi.spyOn(Element.prototype, "animate").mockImplementation(
            () =>
                ({
                    cancel: vi.fn(),
                    finish: vi.fn(),
                    pause: vi.fn(),
                    play: vi.fn(),
                    reverse: vi.fn(),
                    finished: Promise.resolve(),
                    playState: "running",
                    addEventListener: vi.fn(),
                    removeEventListener: vi.fn(),
                }) as unknown as Animation,
        );
        const scroller = document.createElement("div");
        attachScrollStub(scroller);

        const props = $state({
            activeKey: "app" as WorkAppViewKey | undefined,
            scrollContainer: scroller as HTMLElement | Window | null | undefined,
            restoreScroll: true,
            withTransitions: true,
        });

        const instance = mount(WorkAppViewStageTestHost, {
            target: container,
            props,
        });
        instances.push(instance);
        flushSync();

        // Scroll "app" to 420 and switch to "docs" (restores 0 -> delta = -420)
        scroller.scrollTop = 420;
        props.activeKey = "docs";
        flushSync();

        const outgoingAppEl = container.querySelector<HTMLElement>('[data-view="app"][data-exiting]');
        const incomingDocsEl = container.querySelector<HTMLElement>('[data-view="docs"]:not([data-exiting])');
        expect(outgoingAppEl).not.toBeNull();
        expect(outgoingAppEl?.style.translate).toBe("0 -420px");
        expect(incomingDocsEl).not.toBeNull();
        expect(incomingDocsEl?.style.translate).toBe("");

        // Switch back from "docs" (scrollTop = 0) to "app" (restores 420 -> delta = +420)
        scroller.scrollTop = 0;
        props.activeKey = "app";
        flushSync();

        const outgoingDocsEl = container.querySelector<HTMLElement>('[data-view="docs"][data-exiting]');
        expect(outgoingDocsEl).not.toBeNull();
        expect(outgoingDocsEl?.style.translate).toBe("0 420px");

        // Verify workAppViewIn clears any stale translate offset on rapid reversal
        workAppViewIn(outgoingDocsEl as HTMLElement);
        expect((outgoingDocsEl as HTMLElement).style.translate).toBe("");
    });
});
