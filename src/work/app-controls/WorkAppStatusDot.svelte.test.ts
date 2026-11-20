import { flushSync, mount, unmount } from "svelte";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import WorkAppStatusDot from "./WorkAppStatusDot.svelte";
import { WORK_APP_STATUS_DEFAULTS, type WorkAppStatusColor } from "./index.ts";

describe("WorkAppStatusDot", () => {
    let container: HTMLDivElement;
    const instances: Array<Record<string, unknown>> = [];

    beforeEach(() => {
        vi.useFakeTimers();
        container = document.createElement("div");
        document.body.append(container);
    });

    afterEach(async () => {
        for (const instance of instances) {
            unmount(instance);
        }
        instances.length = 0;

        await Promise.resolve();
        vi.advanceTimersByTime(500);

        container.remove();
        vi.useRealTimers();
    });

    test("uses default status label in tooltip when no custom label is provided", () => {
        const instance = mount(WorkAppStatusDot, {
            target: container,
            props: { status: "positive" },
        });
        instances.push(instance);
        flushSync();

        const dot = container.querySelector("button");
        const tooltipId = dot?.getAttribute("aria-describedby");
        const tooltipEl = tooltipId ? document.getElementById(tooltipId) : null;

        expect(dot?.getAttribute("aria-label")).toBe(`${WORK_APP_STATUS_DEFAULTS.positive} (positive)`);
        expect(tooltipEl?.textContent).toContain(WORK_APP_STATUS_DEFAULTS.positive);
    });

    test("passes custom label to tooltip instead of default status text", () => {
        const instance = mount(WorkAppStatusDot, {
            target: container,
            props: { status: "positive", label: "Synchronisiert" },
        });
        instances.push(instance);
        flushSync();

        const dot = container.querySelector("button");
        const tooltipId = dot?.getAttribute("aria-describedby");
        const tooltipEl = tooltipId ? document.getElementById(tooltipId) : null;

        expect(dot?.getAttribute("aria-label")).toBe("Synchronisiert (positive)");
        expect(tooltipEl?.textContent).toContain("Synchronisiert");
        expect(tooltipEl?.textContent).not.toContain(WORK_APP_STATUS_DEFAULTS.positive);
    });

    test("reactively updates data-status, aria-label, and tooltip text when status changes", () => {
        const props = $state<{ status: WorkAppStatusColor }>({ status: "negative" });
        const instance = mount(WorkAppStatusDot, {
            target: container,
            props,
        });
        instances.push(instance);
        flushSync();

        const dot = container.querySelector("button");
        const tooltipId = dot?.getAttribute("aria-describedby") ?? "";
        expect(tooltipId).toBeTruthy();
        expect(dot?.dataset.status).toBe("negative");
        expect(dot?.getAttribute("aria-label")).toBe(`${WORK_APP_STATUS_DEFAULTS.negative} (negative)`);
        expect(document.getElementById(tooltipId)?.textContent).toContain(WORK_APP_STATUS_DEFAULTS.negative);

        props.status = "positive";
        flushSync();

        expect(dot?.dataset.status).toBe("positive");
        expect(dot?.getAttribute("aria-label")).toBe(`${WORK_APP_STATUS_DEFAULTS.positive} (positive)`);
        expect(dot?.getAttribute("aria-describedby")).toBe(tooltipId);
        expect(document.getElementById(tooltipId)?.textContent).toContain(WORK_APP_STATUS_DEFAULTS.positive);
        expect(document.getElementById(tooltipId)?.textContent).not.toContain(WORK_APP_STATUS_DEFAULTS.negative);
    });
});
