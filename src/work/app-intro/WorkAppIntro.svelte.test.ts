import { flushSync, mount, unmount } from "svelte";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import type { WorkAppIntroPhase } from "./index.ts";
import WorkAppIntroTestHost from "./WorkAppIntroTestHost.internal.svelte";

const SESSION_STORAGE_KEY = "cs-pfleiderer-boot-session";

interface HostState {
    toolCategory: string;
    toolName: string;
    persist: boolean;
    phase: WorkAppIntroPhase;
    settled: boolean;
}

function advance(ms: number): void {
    vi.advanceTimersByTime(ms);
    flushSync();
}

function queryEl(root: ParentNode, selector: string): HTMLElement | null {
    return root.querySelector<HTMLElement>(selector);
}

describe("WorkAppIntro Svelte 5 Component", () => {
    let container: HTMLDivElement;

    beforeEach(() => {
        vi.useFakeTimers();
        sessionStorage.clear();
        localStorage.clear();
        container = document.createElement("div");
        document.body.append(container);
    });

    afterEach(() => {
        container.remove();
        sessionStorage.clear();
        localStorage.clear();
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    function mountHost(options?: {
        toolCategory?: string;
        toolName?: string;
        persist?: boolean;
    }): { state: HostState; instance: ReturnType<typeof mount> } {
        const state: HostState = $state({
            toolCategory: options?.toolCategory ?? "Operations",
            toolName: options?.toolName ?? "Planner",
            persist: options?.persist ?? false,
            phase: "idle" as WorkAppIntroPhase,
            settled: false,
        });

        const instance = mount(WorkAppIntroTestHost, {
            target: container,
            props: {
                get toolCategory() {
                    return state.toolCategory;
                },
                get toolName() {
                    return state.toolName;
                },
                get persist() {
                    return state.persist;
                },
                get phase() {
                    return state.phase;
                },
                set phase(next: WorkAppIntroPhase) {
                    state.phase = next;
                },
                get settled() {
                    return state.settled;
                },
                set settled(next: boolean) {
                    state.settled = next;
                },
            },
        });
        flushSync();

        return { state, instance };
    }

    test("cold boot transitions cad -> lock -> brand -> curtain -> idle with expected settled flags", () => {
        const { state, instance } = mountHost({ persist: false });

        // Immediately after mount (0ms)
        expect(state.phase).toBe("cad");
        expect(state.settled).toBe(false);
        expect(queryEl(container, ".cs-work-app-intro")?.dataset.phase).toBe("cad");
        expect(queryEl(container, ".cs-work-app-intro-workspace")?.dataset.phase).toBe("cad");

        // 550ms -> "lock", settled remains false
        advance(549);
        expect(state.phase).toBe("cad");
        expect(state.settled).toBe(false);

        advance(1);
        expect(state.phase).toBe("lock");
        expect(state.settled).toBe(false);
        expect(queryEl(container, ".cs-work-app-intro")?.dataset.phase).toBe("lock");

        // 1450ms -> "brand", settled remains false
        advance(900);
        expect(state.phase).toBe("brand");
        expect(state.settled).toBe(false);
        expect(queryEl(container, ".cs-work-app-intro")?.dataset.phase).toBe("brand");

        // 2450ms -> "curtain", settled becomes true
        advance(1000);
        expect(state.phase).toBe("curtain");
        expect(state.settled).toBe(true);
        expect(queryEl(container, ".cs-work-app-intro")?.dataset.phase).toBe("curtain");

        // 2770ms -> "idle", settled stays true, overlay unmounts
        advance(320);
        expect(state.phase).toBe("idle");
        expect(state.settled).toBe(true);
        expect(queryEl(container, ".cs-work-app-intro")).toBeNull();
        expect(queryEl(container, ".cs-work-app-intro-workspace")?.dataset.phase).toBe("idle");

        unmount(instance);
    });

    test.each<{ targetPhase: WorkAppIntroPhase; delayMs: number }>([
        { targetPhase: "cad", delayMs: 0 },
        { targetPhase: "lock", delayMs: 550 },
        { targetPhase: "brand", delayMs: 1450 },
    ])("skip boot by clicking .cs-work-app-intro during $targetPhase", ({ targetPhase, delayMs }) => {
        const { state, instance } = mountHost({ persist: false });

        if (delayMs > 0) {
            advance(delayMs);
        }
        expect(state.phase).toBe(targetPhase);
        expect(state.settled).toBe(false);

        const overlay = container.querySelector<HTMLElement>(".cs-work-app-intro");
        expect(overlay).not.toBeNull();
        overlay?.click();
        flushSync();

        // Immediately transitions to "curtain" and settled = true
        expect(state.phase).toBe("curtain");
        expect(state.settled).toBe(true);
        expect(container.querySelector<HTMLElement>(".cs-work-app-intro")?.dataset.phase).toBe("curtain");

        // Transitions to "idle" after 260ms
        advance(259);
        expect(state.phase).toBe("curtain");
        expect(state.settled).toBe(true);

        advance(1);
        expect(state.phase).toBe("idle");
        expect(state.settled).toBe(true);
        expect(container.querySelector<HTMLElement>(".cs-work-app-intro")).toBeNull();

        unmount(instance);
    });

    test("instant boot when persist=true and sessionStorage has active boot session", () => {
        sessionStorage.setItem(SESSION_STORAGE_KEY, "1");

        const { state, instance } = mountHost({ persist: true });

        expect(state.phase).toBe("idle");
        expect(state.settled).toBe(true);
        expect(container.querySelector<HTMLElement>(".cs-work-app-intro")).toBeNull();
        expect(container.querySelector<HTMLElement>(".cs-work-app-intro-workspace")?.dataset.phase).toBe("idle");

        unmount(instance);
    });

    test("WorkAppIdentityContext inside child reactively reflects phase, settled, toolCategory, and toolName", () => {
        const { state, instance } = mountHost({
            toolCategory: "Production",
            toolName: "Board Optimizer",
            persist: false,
        });

        expect(queryEl(container, '[data-testid="identity-probe"]')?.dataset.toolCategory).toBe("Production");
        expect(queryEl(container, '[data-testid="identity-probe"]')?.dataset.toolName).toBe("Board Optimizer");
        expect(queryEl(container, '[data-testid="identity-probe"]')?.dataset.phase).toBe("cad");
        expect(queryEl(container, '[data-testid="identity-probe"]')?.dataset.settled).toBe("false");

        advance(550);
        expect(queryEl(container, '[data-testid="identity-probe"]')?.dataset.phase).toBe("lock");
        expect(queryEl(container, '[data-testid="identity-probe"]')?.dataset.settled).toBe("false");

        // Reactive prop updates propagate through context
        state.toolCategory = "Logistics";
        state.toolName = "Dispatch";
        flushSync();
        expect(queryEl(container, '[data-testid="identity-probe"]')?.dataset.toolCategory).toBe("Logistics");
        expect(queryEl(container, '[data-testid="identity-probe"]')?.dataset.toolName).toBe("Dispatch");

        advance(900);
        expect(queryEl(container, '[data-testid="identity-probe"]')?.dataset.phase).toBe("brand");
        expect(queryEl(container, '[data-testid="identity-probe"]')?.dataset.settled).toBe("false");

        advance(1000);
        expect(queryEl(container, '[data-testid="identity-probe"]')?.dataset.phase).toBe("curtain");
        expect(queryEl(container, '[data-testid="identity-probe"]')?.dataset.settled).toBe("true");

        advance(320);
        expect(queryEl(container, '[data-testid="identity-probe"]')?.dataset.phase).toBe("idle");
        expect(queryEl(container, '[data-testid="identity-probe"]')?.dataset.settled).toBe("true");

        unmount(instance);
    });
});
