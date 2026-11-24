import { flushSync, mount, unmount } from "svelte";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import CommandPaletteTestHost from "./CommandPaletteTestHost.internal.svelte";
import {
    createCommandPaletteRegistry,
    type CommandPalettePlugin,
    type CommandPaletteQueryContext,
} from "./index.ts";

function getVisibleOptionValues(root: ParentNode): string[] {
    return [...root.querySelectorAll<HTMLElement>('[role="option"]:not([hidden])')].map(
        (el) => el.dataset.value ?? ""
    );
}

describe("createCommandPaletteRegistry", () => {
    let container: HTMLDivElement;

    beforeEach(() => {
        container = document.createElement("div");
        document.body.append(container);
    });

    afterEach(() => {
        container.remove();
        vi.restoreAllMocks();
    });

    test("register, unregister, and disposer manage plugins safely including ID overwrite", () => {
        const registry = createCommandPaletteRegistry();
        const pluginV1: CommandPalettePlugin = { id: "calc", label: "Calculator v1" };
        const pluginV2: CommandPalettePlugin = { id: "calc", label: "Calculator v2" };

        const disposeV1 = registry.register(pluginV1);
        expect(registry.plugins.size).toBe(1);
        expect(registry.plugins.get("calc")).toBe(pluginV1);

        // Re-registering same ID replaces v1; stale disposer must not delete v2.
        const disposeV2 = registry.register(pluginV2);
        expect(registry.plugins.get("calc")).toBe(pluginV2);

        disposeV1();
        expect(registry.plugins.get("calc")).toBe(pluginV2);

        disposeV2();
        expect(registry.plugins.size).toBe(0);

        registry.register(pluginV1);
        expect(registry.plugins.has("calc")).toBe(true);
        registry.unregister("calc");
        expect(registry.plugins.size).toBe(0);
    });

    test("registerCommands shorthand registers unique plugins with group, page, and priority", () => {
        const registry = createCommandPaletteRegistry();

        const disposeA = registry.registerCommands(
            [{ value: "cmd-a", label: "Alpha" }],
            { group: "Actions", page: "tools", priority: 20 }
        );
        const disposeB = registry.registerCommands([{ value: "cmd-b", label: "Beta" }], { group: "Navigation" });

        expect(registry.plugins.size).toBe(2);
        const plugins = registry.plugins.values().toArray();
        expect(plugins[0]).toMatchObject({
            label: "Actions",
            page: "tools",
            priority: 20,
        });
        expect(plugins[1]).toMatchObject({
            label: "Navigation",
            page: undefined,
            priority: undefined,
        });

        disposeA();
        expect(registry.plugins.size).toBe(1);
        disposeB();
        expect(registry.plugins.size).toBe(0);
    });

    test("renders plugins in descending priority order and reacts to dynamic register/unregister", () => {
        const registry = createCommandPaletteRegistry();
        registry.registerCommands([{ value: "low", label: "Low Priority" }], { group: "Low", priority: 1 });
        registry.registerCommands([{ value: "high", label: "High Priority" }], { group: "High", priority: 50 });
        registry.registerCommands([{ value: "default", label: "Default Priority" }], { group: "Default" });

        const host = mount(CommandPaletteTestHost, {
            target: container,
            props: { open: true, registry, focusTrap: false },
        });
        flushSync();

        expect(getVisibleOptionValues(document.body)).toEqual(["high", "low", "default"]);

        const disposeTop = registry.registerCommands([{ value: "urgent", label: "Urgent" }], {
            group: "Urgent",
            priority: 100,
        });
        flushSync();
        expect(getVisibleOptionValues(document.body)).toEqual(["urgent", "high", "low", "default"]);

        disposeTop();
        flushSync();
        expect(getVisibleOptionValues(document.body)).toEqual(["high", "low", "default"]);

        unmount(host);
    });

    test("activates prefix plugins with longest-prefix-wins and passes stripped query to dynamic items(ctx)", () => {
        const registry = createCommandPaletteRegistry();
        const seenContexts: CommandPaletteQueryContext[] = [];

        registry.registerCommands([{ value: "root-cmd", label: "Root Command" }], { group: "Root" });

        registry.register({
            id: "actions-prefix",
            label: "Commands",
            prefix: ">",
            filter: false,
            items: (ctx) => {
                seenContexts.push(ctx);
                return [{ value: `action:${ctx.query.trim() || "empty"}`, label: `Run ${ctx.query}` }];
            },
        });

        registry.register({
            id: "deep-actions-prefix",
            label: "Admin Commands",
            prefix: ">>",
            filter: false,
            items: (ctx) => [
                { value: `admin:${ctx.query.trim() || "empty"}`, label: `Admin ${ctx.query}` },
            ],
        });

        registry.register({
            id: "calc-prefix",
            label: "Calculator",
            prefix: "=",
            filter: false,
            items: (ctx) => [{ value: `calc:${ctx.query.trim()}`, label: `Result for ${ctx.query}` }],
        });

        const host = mount(CommandPaletteTestHost, {
            target: container,
            props: { open: true, registry, focusTrap: false },
        });
        flushSync();

        // At root with empty query, prefix plugins stay inactive; root items show.
        expect(getVisibleOptionValues(document.body)).toEqual(["root-cmd"]);

        // Single ">" activates actions-prefix and hides root items.
        host.setInputValue(">deploy");
        flushSync();
        expect(getVisibleOptionValues(document.body)).toEqual(["action:deploy"]);
        const lastCtx = seenContexts.at(-1);
        expect(lastCtx).toMatchObject({
            query: "deploy",
            rawQuery: ">deploy",
            prefix: ">",
            activePage: undefined,
            pages: [],
        });

        // Longer prefix ">>" wins over ">".
        host.setInputValue(">>restart");
        flushSync();
        expect(getVisibleOptionValues(document.body)).toEqual(["admin:restart"]);

        // Switching to "=" activates calculator plugin.
        host.setInputValue("=2+2");
        flushSync();
        expect(getVisibleOptionValues(document.body)).toEqual(["calc:2+2"]);

        // Clearing input returns to root items.
        host.setInputValue("");
        flushSync();
        expect(getVisibleOptionValues(document.body)).toEqual(["root-cmd"]);

        unmount(host);
    });
});
