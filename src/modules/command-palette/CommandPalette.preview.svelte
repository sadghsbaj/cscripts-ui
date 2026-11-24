<script module lang="ts">
    export const id = "command-palette";
    export const label = "Command Palette";
</script>

<script lang="ts">
    import type { Component } from "svelte";
    import {
        BookOpen,
        Calculator,
        Code,
        CreditCard,
        FilePlus,
        FileText,
        Folder,
        GitBranch,
        Layers,
        Monitor,
        Moon,
        Palette,
        PanelRight,
        Plus,
        Search,
        Settings,
        Shield,
        SlidersHorizontal,
        Sparkles,
        Sun,
        Terminal,
        Trash2,
        UserPlus,
    } from "@lucide/svelte";
    import { Badge, BadgeLabel } from "cs/svelte/badge";
    import { Button, ButtonIcon, ButtonLabel } from "cs/svelte/button";
    import { CopyIcon, copyOnClick } from "cs/svelte/clipboard";
    import {
        COMMAND_PALETTE_SIZES,
        CommandPalette,
        CommandPaletteBar,
        CommandPaletteBody,
        CommandPaletteClear,
        CommandPaletteEmpty,
        CommandPaletteFooter,
        CommandPaletteGroup,
        CommandPaletteGroupLabel,
        CommandPaletteIcon,
        CommandPaletteInput,
        CommandPaletteItem,
        CommandPaletteItemDescription,
        CommandPaletteItemIcon,
        CommandPaletteItemShortcut,
        CommandPaletteItemText,
        CommandPaletteList,
        CommandPalettePage,
        CommandPalettePreview,
        CommandPaletteWidget,
        createCommandPaletteRegistry,
        type CommandPaletteIconComponentProps,
        type CommandPalettePluginRenderContext,
        type CommandPaletteSize,
    } from "cs/svelte/command-palette";
    import { Kbd, KbdGroup } from "cs/svelte/kbd";
    import type { OverlayVariant } from "cs/svelte/overlay";
    import {
        SegmentedControl,
        SegmentedControlItem,
        SegmentedControlLabel,
    } from "cs/svelte/segmented-control";
    import { Switch } from "cs/svelte/switch";
    import { TextMorph } from "cs/svelte/text-morph";
    import { theme, type ThemeMode } from "cs/svelte/theme";

    import { PreviewHeader, PreviewSection } from "../../../playground/components/index.ts";

    // --- 1. Workspace Launcher state ---
    let launcherOpen = $state(false);
    let launcherSize = $state<CommandPaletteSize>("md");
    let launcherOverlay = $state<Extract<OverlayVariant, "dim" | "blur">>("dim");
    let launcherPages = $state<string[]>([]);
    let launcherPalette = $state<CommandPalette | undefined>();
    let lastAction = $state("Ready");
    const launcherKbdSize = $derived(launcherSize === "lg" ? "md" : "sm");

    function recordAction(message: string): void {
        lastAction = message;
    }

    function applyTheme(mode: ThemeMode, labelText: string): void {
        theme.set(mode);
        lastAction = `Theme set to ${labelText}`;
    }

    // --- 2. Plugins, Prefix Modes & Inline Widgets state ---
    let pluginOpen = $state(false);
    let pluginInputValue = $state("");
    let calculatorEnabled = $state(true);
    let snippetsEnabled = $state(true);
    let pluginStatus = $state("Ready");

    const pluginRegistry = createCommandPaletteRegistry();

    /**
     * Pure recursive-descent arithmetic evaluator supporting +, -, *, /, parentheses, and decimals.
     * Returns undefined when input is not a valid arithmetic expression.
     */
    function evaluateExpression(raw: string, requireOperator: boolean): string | undefined {
        const cleaned = raw.trim();
        if (!cleaned || cleaned.length > 64) return undefined;
        if (!/^[\d\s()+\-*/.]+$/.test(cleaned)) return undefined;
        if (requireOperator && !/[+\-*/]/.test(cleaned)) return undefined;

        let index = 0;

        function skipSpaces(): void {
            while (index < cleaned.length && cleaned[index] === " ") {
                index += 1;
            }
        }

        function parseExpression(): number | undefined {
            let left = parseTerm();
            if (left === undefined) return undefined;

            skipSpaces();
            while (index < cleaned.length) {
                const op = cleaned[index];
                if (op !== "+" && op !== "-") break;
                index += 1;
                const right = parseTerm();
                if (right === undefined) return undefined;
                left = op === "+" ? left + right : left - right;
                skipSpaces();
            }
            return left;
        }

        function parseTerm(): number | undefined {
            let left = parseFactor();
            if (left === undefined) return undefined;

            skipSpaces();
            while (index < cleaned.length) {
                const op = cleaned[index];
                if (op !== "*" && op !== "/") break;
                index += 1;
                const right = parseFactor();
                if (right === undefined) return undefined;
                if (op === "/") {
                    if (right === 0) return undefined;
                    left /= right;
                } else {
                    left *= right;
                }
                skipSpaces();
            }
            return left;
        }

        function parseFactor(): number | undefined {
            let sign = 1;
            skipSpaces();
            while (index < cleaned.length && (cleaned[index] === "+" || cleaned[index] === "-")) {
                if (cleaned[index] === "-") {
                    sign = -sign;
                }
                index += 1;
                skipSpaces();
            }

            if (index >= cleaned.length) return undefined;

            if (cleaned[index] === "(") {
                index += 1;
                const value = parseExpression();
                skipSpaces();
                if (cleaned[index] !== ")") return undefined;
                index += 1;
                return value === undefined ? undefined : sign * value;
            }

            const start = index;
            let hasDot = false;
            while (index < cleaned.length) {
                const c = cleaned[index];
                if (c !== undefined && c >= "0" && c <= "9") {
                    index += 1;
                } else if (c === "." && !hasDot) {
                    hasDot = true;
                    index += 1;
                } else {
                    break;
                }
            }

            if (index === start) return undefined;
            const num = Number(cleaned.slice(start, index));
            return Number.isFinite(num) ? sign * num : undefined;
        }

        const result = parseExpression();
        skipSpaces();
        if (result === undefined || index !== cleaned.length || !Number.isFinite(result)) {
            return undefined;
        }

        const rounded = Math.round(result * 1_000_000) / 1_000_000;
        return rounded.toLocaleString("en-US", { maximumFractionDigits: 6 });
    }

    const directMathResult = $derived(
        calculatorEnabled && !pluginInputValue.startsWith("=")
            ? evaluateExpression(pluginInputValue, true)
            : undefined
    );

    function useAnswer(value: string): void {
        pluginStatus = `Inserted ${value}`;
        pluginOpen = false;
    }

    $effect(() => {
        if (!calculatorEnabled) return;
        return pluginRegistry.register({
            id: "calculator",
            label: "Calculator",
            prefix: "=",
            priority: 20,
            widget: calculatorWidget,
        });
    });

    $effect(() => {
        if (!snippetsEnabled) return;
        return pluginRegistry.register({
            id: "snippets",
            label: "Snippets",
            prefix: ">",
            priority: 10,
            items: [
                {
                    value: "snippet-standup",
                    label: "Daily standup",
                    description: "Yesterday, today, blockers",
                    icon: FileText,
                    keywords: ["status", "update", "team"],
                    onSelect: () => {
                        pluginStatus = "Inserted Daily standup";
                    },
                },
                {
                    value: "snippet-bug",
                    label: "Bug report",
                    description: "Steps, expected, actual",
                    icon: Terminal,
                    keywords: ["issue", "defect"],
                    onSelect: () => {
                        pluginStatus = "Inserted Bug report";
                    },
                },
                {
                    value: "snippet-release",
                    label: "Release checklist",
                    description: "Changelog, tag, publish",
                    icon: Sparkles,
                    keywords: ["deploy", "ship"],
                    onSelect: () => {
                        pluginStatus = "Inserted Release checklist";
                    },
                },
            ],
        });
    });

    // --- 3. Master-Detail Split Preview state ---
    interface CatalogEntry {
        value: string;
        label: string;
        group: "Components" | "Foundations";
        kind: string;
        importPath: string;
        summary: string;
        exports: readonly string[];
        icon: Component<CommandPaletteIconComponentProps>;
    }

    const CATALOG_ITEMS: readonly CatalogEntry[] = [
        {
            value: "button",
            label: "Button",
            group: "Components",
            kind: "Component",
            importPath: "cs/svelte/button",
            summary: "Tactile action trigger with primary, secondary, tertiary, and elevated surfaces.",
            exports: ["Button", "ButtonIcon", "ButtonLabel"],
            icon: SlidersHorizontal,
        },
        {
            value: "combobox",
            label: "Combobox",
            group: "Components",
            kind: "Component",
            importPath: "cs/svelte/combobox",
            summary: "Filterable form autocomplete paired with a floating anchored listbox.",
            exports: ["Combobox", "ComboboxControl", "ComboboxContent"],
            icon: Search,
        },
        {
            value: "modal",
            label: "Modal",
            group: "Components",
            kind: "Component",
            importPath: "cs/svelte/modal",
            summary: "Top-layer dialog card composed inside Overlay with focus trapping.",
            exports: ["Modal", "ModalHeader", "ModalBody", "ModalFooter"],
            icon: Layers,
        },
        {
            value: "command-palette",
            label: "Command Palette",
            group: "Components",
            kind: "Hybrid",
            importPath: "cs/svelte/command-palette",
            summary: "Top-anchored launcher with scope stacks, plugins, and inline widgets.",
            exports: ["CommandPalette", "CommandPaletteList", "createCommandPaletteRegistry"],
            icon: Terminal,
        },
        {
            value: "color-semantics",
            label: "Color Semantics",
            group: "Foundations",
            kind: "Tokens",
            importPath: "cs/css",
            summary: "Monochrome surface hierarchy paired with a single calibrated accent.",
            exports: ["--cs-color-canvas", "--cs-color-elevated", "--cs-color-accent-solid"],
            icon: Palette,
        },
        {
            value: "motion-tokens",
            label: "Motion Tokens",
            group: "Foundations",
            kind: "Tokens",
            importPath: "cs/css",
            summary: "Snappy spring enter curves and fast quadratic exit durations.",
            exports: ["--cs-dur-enter-sm", "--cs-dur-exit-md", "--cs-ease-enter"],
            icon: BookOpen,
        },
    ];

    const COMPONENT_ITEMS = CATALOG_ITEMS.filter((item) => item.group === "Components");
    const FOUNDATION_ITEMS = CATALOG_ITEMS.filter((item) => item.group === "Foundations");

    let splitOpen = $state(false);
    let splitHighlighted = $state<string | undefined>("button");
    const activeCatalogItem = $derived(CATALOG_ITEMS.find((item) => item.value === splitHighlighted));
</script>

{#snippet calculatorWidget(ctx: CommandPalettePluginRenderContext)}
    {const answer = $derived(evaluateExpression(ctx.query, false))}
    <div class="flex items-center justify-between gap-4">
        <div class="flex flex-col gap-0.5 min-w-0">
            <span class="text-xs text-weak truncate">
                {ctx.query.trim() || "Enter an expression"}
            </span>
            <span class="text-xl font-semibold tracking-tight text-strong tabular-nums">
                {answer ?? "—"}
            </span>
        </div>

        {#if answer}
            <div class="flex items-center gap-1.5 shrink-0">
                <Button
                    variant="secondary"
                    size="sm"
                    {@attach copyOnClick({
                        text: answer,
                        onSuccess: () => {
                            pluginStatus = `Copied ${answer}`;
                        },
                    })}
                >
                    <CopyIcon />
                    <ButtonLabel>Copy</ButtonLabel>
                </Button>
                <Button variant="primary" size="sm" onclick={() => useAnswer(answer)}>
                    <ButtonLabel>Use</ButtonLabel>
                </Button>
            </div>
        {/if}
    </div>
{/snippet}

<div class="flex flex-col gap-10">
    <PreviewHeader
        title="Command Palette"
        description="Fast top-anchored launcher with scope stacks, plugins, inline widgets, and split previews."
    />

    <!-- 1. Workspace Launcher -->
    <PreviewSection
        title="Workspace Launcher"
        description="Press Ctrl+K or open the launcher to run commands and drill into nested scopes."
    >
        <div class="flex flex-wrap items-center gap-3">
            <Button variant="elevated" size="md" onclick={() => (launcherOpen = true)}>
                <ButtonIcon icon={Search} />
                <ButtonLabel>Search commands</ButtonLabel>
                <KbdGroup variant="soft" size="sm">
                    <Kbd symbol="ctrl" />
                    <Kbd>K</Kbd>
                </KbdGroup>
            </Button>

            <SegmentedControl size="sm" bind:value={launcherSize} aria-label="Palette size">
                {#each COMMAND_PALETTE_SIZES as size (size)}
                    <SegmentedControlItem value={size}>
                        <SegmentedControlLabel class="uppercase">{size}</SegmentedControlLabel>
                    </SegmentedControlItem>
                {/each}
            </SegmentedControl>

            <SegmentedControl size="sm" bind:value={launcherOverlay} aria-label="Backdrop style">
                <SegmentedControlItem value="dim">
                    <SegmentedControlLabel>Dim</SegmentedControlLabel>
                </SegmentedControlItem>
                <SegmentedControlItem value="blur">
                    <SegmentedControlLabel>Blur</SegmentedControlLabel>
                </SegmentedControlItem>
            </SegmentedControl>

            <TextMorph text={lastAction} class="text-xs text-weak" />
        </div>
    </PreviewSection>

    <!-- 2. Plugins, Prefix Modes & Inline Widgets -->
    <PreviewSection
        title="Plugins & Widgets"
        description="Toggle Calculator and Snippets plugins dynamically with createCommandPaletteRegistry."
    >
        <div class="flex flex-wrap items-center gap-4">
            <Button variant="secondary" size="md" onclick={() => (pluginOpen = true)}>
                <ButtonIcon icon={Calculator} />
                <ButtonLabel>Open extensible palette</ButtonLabel>
            </Button>

            <label class="inline-flex items-center gap-2 text-sm text-main select-none">
                <Switch size="sm" bind:checked={calculatorEnabled} />
                <span>Calculator</span>
            </label>

            <label class="inline-flex items-center gap-2 text-sm text-main select-none">
                <Switch size="sm" bind:checked={snippetsEnabled} />
                <span>Snippets</span>
            </label>

            <TextMorph text={pluginStatus} class="text-xs text-weak" />
        </div>
    </PreviewSection>

    <!-- 3. Master-Detail Split Preview -->
    <PreviewSection
        title="Split Preview"
        description="Pair CommandPaletteList with CommandPalettePreview driven by highlightedValue."
    >
        <Button variant="secondary" size="md" onclick={() => (splitOpen = true)}>
            <ButtonIcon icon={PanelRight} />
            <ButtonLabel>Open component lookup</ButtonLabel>
        </Button>
    </PreviewSection>
</div>

<!-- 1. Workspace Launcher Palette (owns global Mod+K shortcut) -->
<CommandPalette
    bind:this={launcherPalette}
    bind:open={launcherOpen}
    bind:pages={launcherPages}
    size={launcherSize}
    overlayVariant={launcherOverlay}
    shortcut
>
    <CommandPaletteBar>
        <CommandPaletteIcon />
        <CommandPaletteInput placeholder="Search commands…" />
        <CommandPaletteClear />
    </CommandPaletteBar>

    <CommandPaletteBody>
        <CommandPaletteList>
            <CommandPaletteEmpty />

            <CommandPaletteGroup>
                <CommandPaletteGroupLabel>Quick Actions</CommandPaletteGroupLabel>
                <CommandPaletteItem
                    value="new-project"
                    keywords={["create", "workspace"]}
                    onSelect={() => recordAction("Created new project")}
                >
                    <CommandPaletteItemIcon icon={Plus} />
                    <CommandPaletteItemText>New project</CommandPaletteItemText>
                    <CommandPaletteItemShortcut>
                        <KbdGroup variant="ghost" size={launcherKbdSize}>
                            <Kbd symbol="ctrl" />
                            <Kbd>N</Kbd>
                        </KbdGroup>
                    </CommandPaletteItemShortcut>
                </CommandPaletteItem>

                <CommandPaletteItem
                    value="new-document"
                    keywords={["note", "file", "page"]}
                    onSelect={() => recordAction("Created document")}
                >
                    <CommandPaletteItemIcon icon={FilePlus} />
                    <CommandPaletteItemText>Create document</CommandPaletteItemText>
                    <CommandPaletteItemShortcut>
                        <KbdGroup variant="ghost" size={launcherKbdSize}>
                            <Kbd symbol="ctrl" />
                            <Kbd>D</Kbd>
                        </KbdGroup>
                    </CommandPaletteItemShortcut>
                </CommandPaletteItem>

                <CommandPaletteItem
                    value="invite-team"
                    keywords={["share", "members", "people"]}
                    onSelect={() => recordAction("Opened team invite")}
                >
                    <CommandPaletteItemIcon icon={UserPlus} />
                    <CommandPaletteItemText>Invite teammates</CommandPaletteItemText>
                </CommandPaletteItem>

                <CommandPaletteItem
                    value="theme"
                    keywords={["appearance", "dark", "light", "color"]}
                    onSelect={() => launcherPalette?.pushPage("theme", { label: "Theme" })}
                >
                    <CommandPaletteItemIcon icon={Palette} />
                    <CommandPaletteItemText>Change theme</CommandPaletteItemText>
                    <CommandPaletteItemShortcut>
                        <KbdGroup variant="ghost" size={launcherKbdSize}>
                            <Kbd symbol="ctrl" />
                            <Kbd>T</Kbd>
                        </KbdGroup>
                    </CommandPaletteItemShortcut>
                </CommandPaletteItem>
            </CommandPaletteGroup>

            <CommandPaletteGroup>
                <CommandPaletteGroupLabel>Navigation</CommandPaletteGroupLabel>
                <CommandPaletteItem
                    value="go-projects"
                    keywords={["folders", "list"]}
                    onSelect={() => recordAction("Opened Projects")}
                >
                    <CommandPaletteItemIcon icon={Folder} />
                    <CommandPaletteItemText>Projects</CommandPaletteItemText>
                    <CommandPaletteItemShortcut>
                        <KbdGroup variant="ghost" size={launcherKbdSize}>
                            <Kbd>G</Kbd>
                            <Kbd>P</Kbd>
                        </KbdGroup>
                    </CommandPaletteItemShortcut>
                </CommandPaletteItem>

                <CommandPaletteItem
                    value="go-settings"
                    keywords={["preferences", "config"]}
                    onSelect={() => recordAction("Opened Settings")}
                >
                    <CommandPaletteItemIcon icon={Settings} />
                    <CommandPaletteItemText>Settings</CommandPaletteItemText>
                    <CommandPaletteItemShortcut>
                        <KbdGroup variant="ghost" size={launcherKbdSize}>
                            <Kbd>G</Kbd>
                            <Kbd>S</Kbd>
                        </KbdGroup>
                    </CommandPaletteItemShortcut>
                </CommandPaletteItem>

                <CommandPaletteItem
                    value="billing"
                    keywords={["plan", "invoice"]}
                    onSelect={() => recordAction("Opened Billing")}
                >
                    <CommandPaletteItemIcon icon={CreditCard} />
                    <CommandPaletteItemText>Billing & Usage</CommandPaletteItemText>
                </CommandPaletteItem>

                <CommandPaletteItem value="audit-log" disabled>
                    <CommandPaletteItemIcon icon={Shield} />
                    <CommandPaletteItemText>Audit Log</CommandPaletteItemText>
                </CommandPaletteItem>
            </CommandPaletteGroup>

            <CommandPaletteGroup>
                <CommandPaletteGroupLabel>Workspace</CommandPaletteGroupLabel>
                <CommandPaletteItem
                    value="clear-cache"
                    negative
                    keywords={["reset", "delete", "purge"]}
                    onSelect={() => recordAction("Cleared local cache")}
                >
                    <CommandPaletteItemIcon icon={Trash2} />
                    <CommandPaletteItemText>Clear local cache</CommandPaletteItemText>
                </CommandPaletteItem>
            </CommandPaletteGroup>

            <CommandPalettePage value="theme" label="Theme">
                <CommandPaletteGroup>
                    <CommandPaletteGroupLabel>Appearance</CommandPaletteGroupLabel>
                    <CommandPaletteItem value="theme-light" onSelect={() => applyTheme("light", "Light")}>
                        <CommandPaletteItemIcon icon={Sun} />
                        <CommandPaletteItemText>Light</CommandPaletteItemText>
                    </CommandPaletteItem>
                    <CommandPaletteItem value="theme-dark" onSelect={() => applyTheme("dark", "Dark")}>
                        <CommandPaletteItemIcon icon={Moon} />
                        <CommandPaletteItemText>Dark</CommandPaletteItemText>
                    </CommandPaletteItem>
                    <CommandPaletteItem value="theme-system" onSelect={() => applyTheme("system", "System")}>
                        <CommandPaletteItemIcon icon={Monitor} />
                        <CommandPaletteItemText>System</CommandPaletteItemText>
                    </CommandPaletteItem>
                </CommandPaletteGroup>
            </CommandPalettePage>
        </CommandPaletteList>

        <CommandPaletteFooter>
            <div class="flex items-center gap-3">
                <span class="inline-flex items-center gap-1.5">
                    <KbdGroup variant="soft" size={launcherKbdSize}>
                        <Kbd symbol="up" />
                        <Kbd symbol="down" />
                    </KbdGroup>
                    <span>Navigate</span>
                </span>
                <span class="inline-flex items-center gap-1.5">
                    <Kbd variant="soft" size={launcherKbdSize} symbol="enter" />
                    <span>Run</span>
                </span>
            </div>

            <span class="inline-flex items-center gap-1.5">
                <Kbd variant="soft" size={launcherKbdSize} symbol="esc" />
                <span>{launcherPages.length > 0 ? "Back" : "Close"}</span>
            </span>
        </CommandPaletteFooter>
    </CommandPaletteBody>
</CommandPalette>

<!-- 2. Plugins, Prefix Modes & Inline Widgets Palette -->
<CommandPalette
    bind:open={pluginOpen}
    bind:inputValue={pluginInputValue}
    size="md"
    registry={pluginRegistry}
>
    <CommandPaletteBar>
        <CommandPaletteIcon />
        <CommandPaletteInput placeholder="Run or calculate…" />
        <CommandPaletteClear />
    </CommandPaletteBar>

    <CommandPaletteBody>
        <CommandPaletteList>
            {#if directMathResult}
                <CommandPaletteWidget>
                    <div class="flex items-center justify-between gap-4">
                        <div class="flex flex-col gap-0.5 min-w-0">
                            <span class="text-xs text-weak truncate">{pluginInputValue.trim()}</span>
                            <span class="text-xl font-semibold tracking-tight text-strong tabular-nums">
                                {directMathResult}
                            </span>
                        </div>

                        <div class="flex items-center gap-1.5 shrink-0">
                            <Button
                                variant="secondary"
                                size="sm"
                                {@attach copyOnClick({
                                    text: directMathResult,
                                    onSuccess: () => {
                                        pluginStatus = `Copied ${directMathResult}`;
                                    },
                                })}
                            >
                                <CopyIcon />
                                <ButtonLabel>Copy</ButtonLabel>
                            </Button>
                            <Button variant="primary" size="sm" onclick={() => useAnswer(directMathResult)}>
                                <ButtonLabel>Use</ButtonLabel>
                            </Button>
                        </div>
                    </div>
                </CommandPaletteWidget>
            {/if}

            <CommandPaletteEmpty />

            <CommandPaletteGroup>
                <CommandPaletteGroupLabel>Workspace</CommandPaletteGroupLabel>
                <CommandPaletteItem
                    value="switch-branch"
                    keywords={["git", "checkout"]}
                    onSelect={() => (pluginStatus = "Switched branch")}
                >
                    <CommandPaletteItemIcon icon={GitBranch} />
                    <CommandPaletteItemText>Switch branch</CommandPaletteItemText>
                </CommandPaletteItem>

                <CommandPaletteItem
                    value="open-docs"
                    keywords={["reference", "guide"]}
                    onSelect={() => (pluginStatus = "Opened documentation")}
                >
                    <CommandPaletteItemIcon icon={BookOpen} />
                    <CommandPaletteItemText>Search documentation</CommandPaletteItemText>
                </CommandPaletteItem>

                <CommandPaletteItem
                    value="view-source"
                    keywords={["code", "repository"]}
                    onSelect={() => (pluginStatus = "Opened repository")}
                >
                    <CommandPaletteItemIcon icon={Code} />
                    <CommandPaletteItemText>Open repository</CommandPaletteItemText>
                </CommandPaletteItem>
            </CommandPaletteGroup>
        </CommandPaletteList>

        <CommandPaletteFooter>
            <div class="flex items-center gap-3">
                {#if calculatorEnabled}
                    <span class="inline-flex items-center gap-1.5">
                        <Kbd variant="soft" size="sm">=</Kbd>
                        <span>Calculator</span>
                    </span>
                {/if}
                {#if snippetsEnabled}
                    <span class="inline-flex items-center gap-1.5">
                        <Kbd variant="soft" size="sm">&gt;</Kbd>
                        <span>Snippets</span>
                    </span>
                {/if}
            </div>

            <span class="inline-flex items-center gap-1.5">
                <Kbd variant="soft" size="sm" symbol="esc" />
                <span>Close</span>
            </span>
        </CommandPaletteFooter>
    </CommandPaletteBody>
</CommandPalette>

<!-- 3. Master-Detail Split Preview Palette -->
<CommandPalette bind:open={splitOpen} bind:highlightedValue={splitHighlighted} size="lg">
    <CommandPaletteBar>
        <CommandPaletteIcon />
        <CommandPaletteInput placeholder="Find component…" />
        <CommandPaletteClear />
    </CommandPaletteBar>

    <CommandPaletteBody>
        <CommandPaletteList>
            <CommandPaletteEmpty />

            <CommandPaletteGroup>
                <CommandPaletteGroupLabel>Components</CommandPaletteGroupLabel>
                {#each COMPONENT_ITEMS as item (item.value)}
                    <CommandPaletteItem
                        value={item.value}
                        keywords={[item.kind, item.importPath]}
                        onSelect={() => recordAction(`Opened ${item.label}`)}
                    >
                        <CommandPaletteItemIcon icon={item.icon} />
                        <CommandPaletteItemText>{item.label}</CommandPaletteItemText>
                        <CommandPaletteItemDescription>{item.importPath}</CommandPaletteItemDescription>
                    </CommandPaletteItem>
                {/each}
            </CommandPaletteGroup>

            <CommandPaletteGroup>
                <CommandPaletteGroupLabel>Foundations</CommandPaletteGroupLabel>
                {#each FOUNDATION_ITEMS as item (item.value)}
                    <CommandPaletteItem
                        value={item.value}
                        keywords={[item.kind, item.importPath]}
                        onSelect={() => recordAction(`Opened ${item.label}`)}
                    >
                        <CommandPaletteItemIcon icon={item.icon} />
                        <CommandPaletteItemText>{item.label}</CommandPaletteItemText>
                        <CommandPaletteItemDescription>{item.importPath}</CommandPaletteItemDescription>
                    </CommandPaletteItem>
                {/each}
            </CommandPaletteGroup>
        </CommandPaletteList>

        <CommandPalettePreview>
            {#if activeCatalogItem}
                {const ActiveIcon = $derived(activeCatalogItem.icon)}
                <div class="flex flex-col gap-4">
                    <div class="flex items-start justify-between gap-2">
                        <div class="flex items-center gap-2 min-w-0">
                            <ActiveIcon size={16} strokeWidth={2.25} class="text-weak shrink-0" />
                            <span class="text-sm font-semibold text-strong truncate">
                                {activeCatalogItem.label}
                            </span>
                        </div>
                        <Badge variant="soft" color="base" size="xs">
                            <BadgeLabel>{activeCatalogItem.kind}</BadgeLabel>
                        </Badge>
                    </div>

                    <p class="m-0 text-xs leading-relaxed text-main">
                        {activeCatalogItem.summary}
                    </p>

                    <div class="flex flex-col gap-2">
                        <div class="flex flex-col gap-0.5">
                            <span class="text-11px font-medium text-weaker">Import</span>
                            <code class="font-mono text-xs text-strong">{activeCatalogItem.importPath}</code>
                        </div>

                        <div class="flex flex-col gap-1">
                            <span class="text-11px font-medium text-weaker">Exports</span>
                            <div class="flex flex-wrap gap-1.5">
                                {#each activeCatalogItem.exports as symbol (symbol)}
                                    <code class="px-1.5 py-0.5 rounded-md bg-base-soft font-mono text-11px text-main">
                                        {symbol}
                                    </code>
                                {/each}
                            </div>
                        </div>
                    </div>
                </div>
            {:else}
                <div class="h-full flex-center text-xs text-weaker">
                    Select an item to preview.
                </div>
            {/if}
        </CommandPalettePreview>

        <CommandPaletteFooter>
            <TextMorph
                text={activeCatalogItem ? activeCatalogItem.importPath : "No selection"}
                class="font-mono text-xs text-weak"
            />
            <span class="inline-flex items-center gap-1.5">
                <Kbd variant="soft" size="md" symbol="enter" />
                <span>Open</span>
            </span>
        </CommandPaletteFooter>
    </CommandPaletteBody>
</CommandPalette>
