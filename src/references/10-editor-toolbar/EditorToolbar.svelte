<script lang="ts">
    import {
        AlignCenter,
        AlignJustify,
        AlignLeft,
        AlignRight,
        Baseline,
        Bold,
        Check,
        Copy,
        Highlighter,
        Italic,
        Link2,
        List,
        ListOrdered,
        Plus,
        Redo2,
        RefreshCw,
        RemoveFormatting,
        RotateCcw,
        Strikethrough,
        Trash2,
        Underline,
        Undo2,
    } from "@lucide/svelte";
    import { Button, ButtonIcon, ButtonLabel } from "cs/svelte/button";
    import { CopyIcon, copyOnClick, copyToClipboard } from "cs/svelte/clipboard";
    import {
        ColorArea,
        ColorEyeDropper,
        ColorInput,
        ColorPicker,
        ColorSlider,
        ColorSwatch,
        ColorSwatchGroup,
    } from "cs/svelte/color";
    import {
        ContextMenu,
        ContextMenuContent,
        ContextMenuItem,
        ContextMenuItemIcon,
        ContextMenuItemText,
        contextMenuTrigger,
    } from "cs/svelte/context-menu";
    import { rovingFocus } from "cs/svelte/focus";
    import { Popover, popoverTrigger } from "cs/svelte/popover";
    import { HitArea } from "cs/svelte/hit-area";
    import { Select, SelectContent, SelectItem, SelectItemText, SelectTrigger, SelectValue } from "cs/svelte/select";
    import { TextInput, TextInputAction, TextInputField, TextInputIcon } from "cs/svelte/text-input";
    import { ToggleButton, ToggleButtonGroup, ToggleButtonIcon } from "cs/svelte/toggle-button";
    import { tooltip } from "cs/svelte/tooltip";

    export type EditorFont = "inter" | "georgia" | "jetbrains-mono" | "merriweather" | "system-ui";
    export type EditorInlineFormat = "bold" | "italic" | "underline" | "strikethrough";
    export type EditorAlignment = "left" | "center" | "right" | "justify";
    export type EditorListType = "bullet" | "ordered";

    export interface EditorToolbarProps {
        font?: EditorFont;
        formats?: EditorInlineFormat[];
        alignment?: EditorAlignment;
        list?: EditorListType;
        textColor?: string;
        highlightColor?: string;
        linkUrl?: string;
        disabled?: boolean;
        class?: string;
    }

    interface FontOption {
        value: EditorFont;
        label: string;
    }

    interface ColorPreset {
        color: string;
        label: string;
    }

    interface ColorPickerPopoverConfig {
        id: string;
        label: string;
        swatchesLabel: string;
        getSwatches: () => string[];
        setSwatches: (swatches: string[]) => void;
        getRef: () => HTMLDivElement | null;
        setRef: (el: HTMLDivElement | null) => void;
        getValue: () => string;
        setValue: (value: string) => void;
        onReset: () => void;
    }

    interface ToolbarSnapshot {
        font: EditorFont;
        formats: EditorInlineFormat[];
        alignment: EditorAlignment | undefined;
        list: EditorListType | undefined;
        textColor: string;
        highlightColor: string;
        linkUrl: string;
    }

    const DEFAULT_TEXT_COLOR = "#18181b";
    const DEFAULT_HIGHLIGHT_COLOR = "#fef08a";

    const FONT_OPTIONS: readonly FontOption[] = [
        { value: "inter", label: "Inter" },
        { value: "georgia", label: "Georgia" },
        { value: "jetbrains-mono", label: "JetBrains Mono" },
        { value: "merriweather", label: "Merriweather" },
        { value: "system-ui", label: "System UI" },
    ];

    const TEXT_COLOR_PRESETS: readonly ColorPreset[] = [
        { color: "#18181b", label: "Zinc" },
        { color: "#dc2626", label: "Red" },
        { color: "#ea580c", label: "Orange" },
        { color: "#16a34a", label: "Green" },
        { color: "#2563eb", label: "Blue" },
        { color: "#9333ea", label: "Purple" },
        { color: "#db2777", label: "Pink" },
    ];

    const HIGHLIGHT_COLOR_PRESETS: readonly ColorPreset[] = [
        { color: "#fef08a", label: "Yellow" },
        { color: "#fed7aa", label: "Peach" },
        { color: "#bbf7d0", label: "Mint" },
        { color: "#bfdbfe", label: "Sky" },
        { color: "#e9d5ff", label: "Lavender" },
        { color: "#fbcfe8", label: "Rose" },
        { color: "#e4e4e7", label: "Neutral" },
    ];

    let {
        font = $bindable<EditorFont>("inter"),
        formats = $bindable<EditorInlineFormat[]>(["bold", "italic"]),
        alignment = $bindable<EditorAlignment | undefined>("left"),
        list = $bindable<EditorListType | undefined>(),
        textColor = $bindable(DEFAULT_TEXT_COLOR),
        highlightColor = $bindable(DEFAULT_HIGHLIGHT_COLOR),
        linkUrl = $bindable(""),
        disabled = false,
        class: className,
    }: EditorToolbarProps = $props();

    const uid = $props.id();
    const textColorPopoverId = `${uid}-text-color`;
    const highlightPopoverId = `${uid}-highlight-color`;
    const linkPopoverId = `${uid}-link`;

    let textColorPopoverRef = $state<HTMLDivElement | null>(null);
    let highlightPopoverRef = $state<HTMLDivElement | null>(null);
    let linkPopoverRef = $state<HTMLDivElement | null>(null);
    let linkInputRef = $state<HTMLInputElement | null>(null);
    let draftLinkUrl = $state(linkUrl);
    let hadLinkOnOpen = $state(false);
    let linkInvalid = $state(false);
    let textColorSwatches = $state<string[]>(TEXT_COLOR_PRESETS.map((p) => p.color));
    let highlightColorSwatches = $state<string[]>(HIGHLIGHT_COLOR_PRESETS.map((p) => p.color));
    let contextSwatchColor = $state("");

    // Seed one prior snapshot so Undo is active on initial render and Redo starts disabled.
    let history = $state<ToolbarSnapshot[]>([
        {
            font: "inter",
            formats: ["bold"],
            alignment: "left",
            list: undefined,
            textColor: DEFAULT_TEXT_COLOR,
            highlightColor: DEFAULT_HIGHLIGHT_COLOR,
            linkUrl: "",
        },
        {
            font: "inter",
            formats: ["bold", "italic"],
            alignment: "left",
            list: undefined,
            textColor: DEFAULT_TEXT_COLOR,
            highlightColor: DEFAULT_HIGHLIGHT_COLOR,
            linkUrl: "",
        },
    ]);
    let historyIndex = $state(1);

    const canUndo = $derived(!disabled && historyIndex > 0);
    const canRedo = $derived(!disabled && historyIndex < history.length - 1);
    const hasLink = $derived(linkUrl.trim().length > 0);

    function captureSnapshot(): ToolbarSnapshot {
        return {
            font,
            formats: [...formats],
            alignment,
            list,
            textColor,
            highlightColor,
            linkUrl,
        };
    }

    function applySnapshot(snapshot: ToolbarSnapshot): void {
        font = snapshot.font;
        formats = [...snapshot.formats];
        alignment = snapshot.alignment;
        list = snapshot.list;
        textColor = snapshot.textColor;
        highlightColor = snapshot.highlightColor;
        linkUrl = snapshot.linkUrl;
        draftLinkUrl = snapshot.linkUrl;
    }

    function recordHistory(): void {
        const next = captureSnapshot();
        history = [...history.slice(0, historyIndex + 1), next];
        historyIndex = history.length - 1;
    }

    function handleUndo(): void {
        if (!canUndo) return;
        const snapshot = history[historyIndex - 1];
        if (!snapshot) return;
        historyIndex -= 1;
        applySnapshot(snapshot);
    }

    function handleRedo(): void {
        if (!canRedo) return;
        const snapshot = history[historyIndex + 1];
        if (!snapshot) return;
        historyIndex += 1;
        applySnapshot(snapshot);
    }

    function handleClearFormatting(): void {
        if (disabled) return;
        formats = [];
        alignment = undefined;
        list = undefined;
        textColor = DEFAULT_TEXT_COLOR;
        highlightColor = DEFAULT_HIGHLIGHT_COLOR;
        linkUrl = "";
        draftLinkUrl = "";
        recordHistory();
    }

    function handleLinkPopoverToggle(event: ToggleEvent): void {
        if (event.newState === "open") {
            hadLinkOnOpen = hasLink;
            linkInvalid = false;
            draftLinkUrl = linkUrl;
            requestAnimationFrame(() => {
                linkInputRef?.focus();
            });
            return;
        }
        if (event.newState === "closed") {
            linkInvalid = false;
        }
    }

    function isValidHttpUrl(value: string): boolean {
        try {
            const parsed = new URL(value);
            return parsed.protocol === "http:" || parsed.protocol === "https:";
        } catch {
            return false;
        }
    }

    function handleApplyLink(event: SubmitEvent): void {
        event.preventDefault();
        if (disabled) return;
        const trimmed = draftLinkUrl.trim();
        if (trimmed === "") {
            const hadPreviousLink = linkUrl.length > 0;
            linkUrl = "";
            draftLinkUrl = "";
            linkInvalid = false;
            if (hadPreviousLink) recordHistory();
            linkPopoverRef?.hidePopover();
            return;
        }
        if (!isValidHttpUrl(trimmed)) {
            linkInvalid = true;
            linkInputRef?.focus();
            return;
        }
        linkInvalid = false;
        linkUrl = trimmed;
        recordHistory();
        linkPopoverRef?.hidePopover();
    }

    function handleRemoveLink(): void {
        if (disabled) return;
        linkUrl = "";
        draftLinkUrl = "";
        recordHistory();
        linkPopoverRef?.hidePopover();
    }

    function resetTextColor(): void {
        if (disabled) return;
        textColor = DEFAULT_TEXT_COLOR;
        recordHistory();
        textColorPopoverRef?.hidePopover();
    }

    function resetHighlightColor(): void {
        if (disabled) return;
        highlightColor = DEFAULT_HIGHLIGHT_COLOR;
        recordHistory();
        highlightPopoverRef?.hidePopover();
    }

    $effect(() => {
        if (!disabled) return;
        textColorPopoverRef?.hidePopover();
        highlightPopoverRef?.hidePopover();
        linkPopoverRef?.hidePopover();
    });
</script>

{#snippet colorPickerPopover(config: ColorPickerPopoverConfig)}
    {const hasCurrentSwatch = $derived(
        config.getSwatches().some((s) => s.toLowerCase() === config.getValue().toLowerCase()),
    )}
    <Popover
        bind:ref={config.getRef, config.setRef}
        id={config.id}
        placement="bottom-start"
        width="content"
        class="bg-elevated shadow-floating rounded-2xl squircle p-3.5"
    >
        <ColorPicker
            bind:value={config.getValue, config.setValue}
            onCommit={() => recordHistory()}
            label={config.label}
            style="--cs-color-picker-width: 244px; --cs-color-picker-gap: 12px"
        >
            <div class="min-h-7 px-0.5 flex items-center justify-between gap-2 w-full">
                <span class="text-sm font-600 leading-5 tracking-tight text-strong">{config.label}</span>
                <Button variant="ghost" size="xs" {disabled} onclick={config.onReset}>
                    <ButtonIcon icon={RotateCcw} />
                    <ButtonLabel>Reset</ButtonLabel>
                </Button>
            </div>
            <ColorArea size="sm" />
            <ColorSlider size="sm" channel="hue" />
            <div class="flex items-center gap-1.5 w-full">
                <ColorInput variant="soft" size="sm" showSwatch class="flex-1 min-w-0">
                    <TextInputAction
                        aria-label="Copy color"
                        {@attach copyOnClick({ text: () => config.getValue() })}
                        {@attach tooltip({ text: "Copy", placement: "top" })}
                    >
                        <CopyIcon />
                    </TextInputAction>
                </ColorInput>
                <ColorEyeDropper variant="ghost" size="sm" unsupportedBehavior="disable" />
                <Button
                    variant="tertiary"
                    size="sm"
                    iconOnly
                    disabled={disabled || hasCurrentSwatch}
                    aria-label="Add swatch"
                    onclick={() => {
                        if (disabled || hasCurrentSwatch) return;
                        config.setSwatches([...config.getSwatches(), config.getValue()]);
                    }}
                    {@attach tooltip({ text: "Add swatch", placement: "top", enabled: () => !disabled && !hasCurrentSwatch })}
                >
                    <ButtonIcon icon={Plus} />
                    <HitArea size="md" />
                </Button>
            </div>

            <ContextMenu size="sm">
                <ColorSwatchGroup
                    columns={7}
                    style="--cs-color-swatch-group-gap: 8px"
                    aria-label={config.swatchesLabel}
                >
                    {#each config.getSwatches() as swatch (swatch)}
                        <ColorSwatch
                            size="md"
                            color={swatch}
                            label={swatch}
                            {@attach contextMenuTrigger({ onOpen: () => (contextSwatchColor = swatch) })}
                        />
                    {/each}
                </ColorSwatchGroup>
                <ContextMenuContent>
                    <ContextMenuItem
                        onSelect={() => {
                            void copyToClipboard(contextSwatchColor);
                        }}
                    >
                        <ContextMenuItemIcon icon={Copy} />
                        <ContextMenuItemText>Copy color</ContextMenuItemText>
                    </ContextMenuItem>
                    <ContextMenuItem
                        disabled={config.getValue().toLowerCase() === contextSwatchColor.toLowerCase()}
                        onSelect={() => {
                            const current = config.getValue();
                            const targetLower = contextSwatchColor.toLowerCase();
                            const currentLower = current.toLowerCase();
                            if (targetLower === currentLower) return;
                            const swatches = config.getSwatches();
                            const hasCurrentElsewhere = swatches.some((s) => s.toLowerCase() === currentLower);
                            if (hasCurrentElsewhere) {
                                config.setSwatches(swatches.filter((s) => s !== contextSwatchColor));
                            } else {
                                config.setSwatches(
                                    swatches.map((s) => (s === contextSwatchColor ? current : s)),
                                );
                            }
                        }}
                    >
                        <ContextMenuItemIcon icon={RefreshCw} />
                        <ContextMenuItemText>Replace with current</ContextMenuItemText>
                    </ContextMenuItem>
                    <ContextMenuItem
                        negative
                        disabled={config.getSwatches().length <= 1}
                        onSelect={() => {
                            const swatches = config.getSwatches();
                            if (swatches.length <= 1) return;
                            config.setSwatches(swatches.filter((s) => s !== contextSwatchColor));
                        }}
                    >
                        <ContextMenuItemIcon icon={Trash2} />
                        <ContextMenuItemText>Remove</ContextMenuItemText>
                    </ContextMenuItem>
                </ContextMenuContent>
            </ContextMenu>
        </ColorPicker>
    </Popover>
{/snippet}

<div
    role="toolbar"
    aria-label="Editor formatting"
    aria-disabled={disabled ? "true" : undefined}
    class={["cs-editor-toolbar flex-center flex-wrap gap-2", className]}
>
    <!-- History -->
    <div class="flex items-center gap-1.5">
        <Button
            variant="elevated"
            size="lg"
            iconOnly
            disabled={!canUndo}
            aria-label="Undo"
            onclick={handleUndo}
            {@attach tooltip({ text: "Undo", placement: "top", enabled: () => canUndo })}
        >
            <ButtonIcon icon={Undo2} />
            <HitArea size="md" />
        </Button>

        <Button
            variant="elevated"
            size="lg"
            iconOnly
            disabled={!canRedo}
            aria-label="Redo"
            onclick={handleRedo}
            {@attach tooltip({ text: "Redo", placement: "top", enabled: () => canRedo })}
        >
            <ButtonIcon icon={Redo2} />
            <HitArea size="md" />
        </Button>
    </div>

    <!-- Font Family -->
    <Select
        variant="elevated"
        size="lg"
        bind:value={font}
        {disabled}
        onValueChange={() => recordHistory()}
    >
        <SelectTrigger class="cs-editor-toolbar-select-trigger" aria-label="Font family">
            <SelectValue placeholder="Font" />
        </SelectTrigger>
        <SelectContent placement="bottom-start" width="min-anchor">
            {#each FONT_OPTIONS as option (option.value)}
                <SelectItem value={option.value}>
                    <SelectItemText>{option.label}</SelectItemText>
                </SelectItem>
            {/each}
        </SelectContent>
    </Select>

    <!-- Inline Formatting -->
    <ToggleButtonGroup
        type="multiple"
        bind:value={formats}
        {disabled}
        onValueChange={() => recordHistory()}
        aria-label="Text formatting"
        {@attach rovingFocus({
            orientation: "horizontal",
            items: ":scope > button:not(:disabled)",
            homeEnd: true,
            loop: true,
            enabled: () => !disabled,
        })}
    >
        <ToggleButton
            value="bold"
            variant="elevated"
            color="accent"
            size="lg"
            iconOnly
            aria-label="Bold"
            {@attach tooltip({ text: "Bold", placement: "top", enabled: () => !disabled })}
        >
            <ToggleButtonIcon icon={Bold} />
            <HitArea size="md" />
        </ToggleButton>
        <ToggleButton
            value="italic"
            variant="elevated"
            color="accent"
            size="lg"
            iconOnly
            aria-label="Italic"
            {@attach tooltip({ text: "Italic", placement: "top", enabled: () => !disabled })}
        >
            <ToggleButtonIcon icon={Italic} />
            <HitArea size="md" />
        </ToggleButton>
        <ToggleButton
            value="underline"
            variant="elevated"
            color="accent"
            size="lg"
            iconOnly
            aria-label="Underline"
            {@attach tooltip({ text: "Underline", placement: "top", enabled: () => !disabled })}
        >
            <ToggleButtonIcon icon={Underline} />
            <HitArea size="md" />
        </ToggleButton>
        <ToggleButton
            value="strikethrough"
            variant="elevated"
            color="accent"
            size="lg"
            iconOnly
            aria-label="Strikethrough"
            {@attach tooltip({ text: "Strikethrough", placement: "top", enabled: () => !disabled })}
        >
            <ToggleButtonIcon icon={Strikethrough} />
            <HitArea size="md" />
        </ToggleButton>
    </ToggleButtonGroup>

    <!-- Colors (Text & Highlight) -->
    <div class="flex items-center gap-1.5">
        <Button
            variant="elevated"
            size="lg"
            iconOnly
            {disabled}
            aria-label="Text color"
            {@attach tooltip({ text: "Text color", placement: "top", enabled: () => !disabled })}
            {@attach popoverTrigger({
                target: textColorPopoverId,
                triggerOn: "click",
                enabled: () => !disabled,
            })}
        >
            <span class="flex-center flex-col gap-0.5 pointer-events-none">
                <ButtonIcon icon={Baseline} />
                <span
                    class="w-[14px] h-[3px] rounded-full border border-black/10 dark:border-white/15"
                    style:background-color={textColor}
                    aria-hidden="true"
                ></span>
            </span>
            <HitArea size="md" />
        </Button>

        {@render colorPickerPopover({
            id: textColorPopoverId,
            label: "Text color",
            swatchesLabel: "Text color swatches",
            getSwatches: () => textColorSwatches,
            setSwatches: (swatches) => (textColorSwatches = swatches),
            getRef: () => textColorPopoverRef,
            setRef: (el) => (textColorPopoverRef = el),
            getValue: () => textColor,
            setValue: (value) => (textColor = value),
            onReset: resetTextColor,
        })}

        <Button
            variant="elevated"
            size="lg"
            iconOnly
            {disabled}
            aria-label="Highlight color"
            {@attach tooltip({ text: "Highlight color", placement: "top", enabled: () => !disabled })}
            {@attach popoverTrigger({
                target: highlightPopoverId,
                triggerOn: "click",
                enabled: () => !disabled,
            })}
        >
            <span class="flex-center flex-col gap-0.5 pointer-events-none">
                <ButtonIcon icon={Highlighter} />
                <span
                    class="w-[14px] h-[3px] rounded-full border border-black/10 dark:border-white/15"
                    style:background-color={highlightColor}
                    aria-hidden="true"
                ></span>
            </span>
            <HitArea size="md" />
        </Button>

        {@render colorPickerPopover({
            id: highlightPopoverId,
            label: "Highlight color",
            swatchesLabel: "Highlight color swatches",
            getSwatches: () => highlightColorSwatches,
            setSwatches: (swatches) => (highlightColorSwatches = swatches),
            getRef: () => highlightPopoverRef,
            setRef: (el) => (highlightPopoverRef = el),
            getValue: () => highlightColor,
            setValue: (value) => (highlightColor = value),
            onReset: resetHighlightColor,
        })}
    </div>

    <!-- Alignment -->
    <ToggleButtonGroup
        type="single"
        allowDeselect
        bind:value={alignment}
        {disabled}
        onValueChange={() => recordHistory()}
        aria-label="Text alignment"
        {@attach rovingFocus({
            orientation: "horizontal",
            items: ":scope > button:not(:disabled)",
            homeEnd: true,
            loop: true,
            enabled: () => !disabled,
            initialActive: (items) => items.find((item) => item.getAttribute("aria-pressed") === "true") ?? items[0] ?? null,
        })}
    >
        <ToggleButton
            value="left"
            variant="elevated"
            color="accent"
            size="lg"
            iconOnly
            aria-label="Align left"
            {@attach tooltip({ text: "Align left", placement: "top", enabled: () => !disabled })}
        >
            <ToggleButtonIcon icon={AlignLeft} />
            <HitArea size="md" />
        </ToggleButton>
        <ToggleButton
            value="center"
            variant="elevated"
            color="accent"
            size="lg"
            iconOnly
            aria-label="Align center"
            {@attach tooltip({ text: "Align center", placement: "top", enabled: () => !disabled })}
        >
            <ToggleButtonIcon icon={AlignCenter} />
            <HitArea size="md" />
        </ToggleButton>
        <ToggleButton
            value="right"
            variant="elevated"
            color="accent"
            size="lg"
            iconOnly
            aria-label="Align right"
            {@attach tooltip({ text: "Align right", placement: "top", enabled: () => !disabled })}
        >
            <ToggleButtonIcon icon={AlignRight} />
            <HitArea size="md" />
        </ToggleButton>
        <ToggleButton
            value="justify"
            variant="elevated"
            color="accent"
            size="lg"
            iconOnly
            aria-label="Justify"
            {@attach tooltip({ text: "Justify", placement: "top", enabled: () => !disabled })}
        >
            <ToggleButtonIcon icon={AlignJustify} />
            <HitArea size="md" />
        </ToggleButton>
    </ToggleButtonGroup>

    <!-- Lists -->
    <ToggleButtonGroup
        type="single"
        allowDeselect
        bind:value={list}
        {disabled}
        onValueChange={() => recordHistory()}
        aria-label="Lists"
        {@attach rovingFocus({
            orientation: "horizontal",
            items: ":scope > button:not(:disabled)",
            homeEnd: true,
            loop: true,
            enabled: () => !disabled,
            initialActive: (items) => items.find((item) => item.getAttribute("aria-pressed") === "true") ?? items[0] ?? null,
        })}
    >
        <ToggleButton
            value="bullet"
            variant="elevated"
            color="accent"
            size="lg"
            iconOnly
            aria-label="Bulleted list"
            {@attach tooltip({ text: "Bulleted list", placement: "top", enabled: () => !disabled })}
        >
            <ToggleButtonIcon icon={List} />
            <HitArea size="md" />
        </ToggleButton>
        <ToggleButton
            value="ordered"
            variant="elevated"
            color="accent"
            size="lg"
            iconOnly
            aria-label="Numbered list"
            {@attach tooltip({ text: "Numbered list", placement: "top", enabled: () => !disabled })}
        >
            <ToggleButtonIcon icon={ListOrdered} />
            <HitArea size="md" />
        </ToggleButton>
    </ToggleButtonGroup>

    <!-- Link & Clear Formatting -->
    <div class="flex items-center gap-1.5">
        <Button
            variant="elevated"
            size="lg"
            iconOnly
            {disabled}
            aria-label="Insert link"
            {@attach tooltip({ text: "Insert link", placement: "top", enabled: () => !disabled })}
            {@attach popoverTrigger({
                target: linkPopoverId,
                triggerOn: "click",
                enabled: () => !disabled,
            })}
        >
            <ButtonIcon icon={Link2} />
            <HitArea size="md" />
        </Button>

        <Popover
            bind:ref={linkPopoverRef}
            id={linkPopoverId}
            placement="bottom-end"
            width="content"
            class="bg-elevated shadow-floating rounded-2xl squircle p-3.5 w-72"
            ontoggle={handleLinkPopoverToggle}
        >
            <form novalidate class="flex flex-col gap-2" onsubmit={handleApplyLink}>
                <div class="min-h-7 px-0.5 flex items-center justify-between gap-2">
                    <span class="text-sm font-600 leading-5 tracking-tight text-strong">Insert link</span>
                    {#if linkInvalid}
                        <span role="alert" class="text-xs font-500 text-[var(--cs-color-negative-soft-fg)]">
                            Invalid URL
                        </span>
                    {:else if hadLinkOnOpen}
                        <Button variant="ghost" size="xs" {disabled} onclick={handleRemoveLink}>
                            <ButtonLabel>Remove</ButtonLabel>
                        </Button>
                    {/if}
                </div>

                <div class="flex items-center gap-2">
                    <TextInput variant="soft" size="sm" invalid={linkInvalid} {disabled} class="flex-1 min-w-0">
                        <TextInputIcon icon={Link2} />
                        <TextInputField
                            bind:ref={linkInputRef}
                            type="url"
                            placeholder="https://example.com"
                            aria-label="Link URL"
                            bind:value={draftLinkUrl}
                            oninput={() => (linkInvalid = false)}
                        />
                    </TextInput>

                    <Button
                        type="submit"
                        variant="primary"
                        size="sm"
                        iconOnly
                        {disabled}
                        aria-label="Apply link"
                        {@attach tooltip({ text: "Apply", placement: "top", enabled: () => !disabled })}
                    >
                        <ButtonIcon icon={Check} />
                        <HitArea size="md" />
                    </Button>
                </div>
            </form>
        </Popover>

        <Button
            variant="elevated"
            size="lg"
            iconOnly
            {disabled}
            aria-label="Clear formatting"
            onclick={handleClearFormatting}
            {@attach tooltip({ text: "Clear formatting", placement: "top", enabled: () => !disabled })}
        >
            <ButtonIcon icon={RemoveFormatting} />
            <HitArea size="md" />
        </Button>
    </div>
</div>

<style>
    .cs-editor-toolbar :global(.cs-button-control[data-icon-only] > .cs-button-control-icon) {
        width: 18px;
        height: 18px;
    }

    /* Match the 40px pill silhouette (20px radius + squircle) and stabilize width across font labels. */
    :global(.cs-editor-toolbar-select-trigger) {
        --cs-select-trigger-radius: 20px;
        --cs-select-trigger-px: 14px;
        min-width: 148px;
        justify-content: space-between;
    }
</style>
