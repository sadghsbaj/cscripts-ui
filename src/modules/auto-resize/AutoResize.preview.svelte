<script module>
    export const id = "auto-resize";
    export const label = "Auto-Resize";
</script>

<script lang="ts">
    import { ArrowUp, Tag } from "@lucide/svelte";
    import { autoResize } from "cs/svelte/auto-resize";
    import { Button, ButtonIcon } from "cs/svelte/button";
    import { HitArea } from "cs/svelte/hit-area";
    import { Switch } from "cs/svelte/switch";
    import { TextArea } from "cs/svelte/text-area";
    import { TextInput, TextInputField, TextInputIcon } from "cs/svelte/text-input";
    import { tooltip } from "cs/svelte/tooltip";
    import { PreviewHeader, PreviewSection, SunkenWell } from "../../../playground/components/index.ts";

    let prompt = $state("");
    let lastSent = $state("");

    let comment = $state(
        "This comment field starts at 3 rows and expands up to 6 rows before scrolling internally."
    );

    let tagName = $state("design-tokens");

    let isEnabled = $state(true);
    let toggleValue = $state("Line 1\nLine 2\nLine 3\nToggle the switch above to disable auto-resize.");

    function sendPrompt(): void {
        const trimmed = prompt.trim();
        if (!trimmed) return;
        lastSent = trimmed;
        prompt = "";
    }

    function handlePromptKeydown(event: KeyboardEvent): void {
        if (event.key !== "Enter" || event.shiftKey) return;
        event.preventDefault();
        sendPrompt();
    }

    const closeScript = ["</", "script>"].join("");

    const composerCode = [
        '<script lang="ts">',
        '    import { ArrowUp } from "@lucide/svelte";',
        '    import { autoResize } from "cs/svelte/auto-resize";',
        '    import { Button, ButtonIcon } from "cs/svelte/button";',
        '    import { TextArea } from "cs/svelte/text-area";',
        "",
        '    let prompt = $state("");',
        closeScript,
        "",
        '<div class="flex items-end gap-2">',
        "    <TextArea",
        '        variant="elevated"',
        '        size="md"',
        "        rows={1}",
        "        bind:value={prompt}",
        '        placeholder="Ask anything..."',
        "        {@attach autoResize({ maxRows: 6 })}",
        "    />",
        '    <Button variant="primary" size="md" iconOnly aria-label="Send message">',
        "        <ButtonIcon icon={ArrowUp} />",
        "    </Button>",
        "</div>",
    ].join("\n");

    const boundedCode = [
        "<TextArea",
        '    variant="soft"',
        '    size="md"',
        "    rows={3}",
        "    bind:value={comment}",
        '    placeholder="Add a comment..."',
        "    {@attach autoResize({ maxRows: 6 })}",
        "/>",
    ].join("\n");

    const inlineWidthCode = [
        '<TextInput variant="soft" size="sm" class="w-auto">',
        "    <TextInputIcon icon={Tag} />",
        "    <TextInputField",
        "        bind:value={tagName}",
        '        placeholder="Tag..."',
        '        {@attach autoResize({ minWidth: "80px", maxWidth: "260px" })}',
        "    />",
        "</TextInput>",
    ].join("\n");

    const enabledCode = [
        '<script lang="ts">',
        '    import { autoResize } from "cs/svelte/auto-resize";',
        '    import { Switch } from "cs/svelte/switch";',
        '    import { TextArea } from "cs/svelte/text-area";',
        "",
        "    let isEnabled = $state(true);",
        '    let value = $state("");',
        closeScript,
        "",
        '<label class="flex items-center gap-3 text-sm text-main select-none">',
        '    <Switch size="md" bind:checked={isEnabled} />',
        '    <span>Auto-resize {isEnabled ? "enabled" : "disabled"}</span>',
        "</label>",
        "",
        "<TextArea",
        '    variant="soft"',
        '    size="md"',
        "    rows={2}",
        "    bind:value",
        "    {@attach autoResize({ maxRows: 6, enabled: () => isEnabled })}",
        "/>",
    ].join("\n");
</script>

<div class="flex flex-col gap-10">
    <PreviewHeader
        title="autoResize"
        description="Zero-listener CSS field-sizing attachment that grows and shrinks TextArea and TextInputField elements to fit their content."
    />

    <PreviewSection
        title="Chat / Prompt Composer"
        description="Starts at a single line (rows={1}) aligned with a md Button, grows up to 6 rows, and snaps back when cleared."
        code={composerCode}
    >
        <SunkenWell class="w-full max-w-lg flex flex-col gap-3">
            <div class="flex items-end gap-2">
                <TextArea
                    variant="elevated"
                    size="md"
                    rows={1}
                    bind:value={prompt}
                    onkeydown={handlePromptKeydown}
                    placeholder="Ask anything... (Enter to send, Shift+Enter for newline)"
                    {@attach autoResize({ maxRows: 6 })}
                />
                <Button
                    variant="primary"
                    size="md"
                    iconOnly
                    aria-label="Send message"
                    disabled={!prompt.trim()}
                    onclick={sendPrompt}
                    {@attach tooltip({ text: "Send message" })}
                >
                    <ButtonIcon icon={ArrowUp} />
                    <HitArea size="md" />
                </Button>
            </div>
            {#if lastSent}
                <p class="text-xs text-weak truncate">Last sent: {lastSent}</p>
            {/if}
        </SunkenWell>
    </PreviewSection>

    <PreviewSection
        title="Bounded Comment Field"
        description="Infers minRows from rows={3} and caps growth at maxRows={6} before vertical scrolling activates."
        code={boundedCode}
    >
        <div class="w-full max-w-lg">
            <TextArea
                variant="soft"
                size="md"
                rows={3}
                bind:value={comment}
                placeholder="Write a comment..."
                {@attach autoResize({ maxRows: 6 })}
            />
        </div>
    </PreviewSection>

    <PreviewSection
        title="Inline Auto-Width TextInput"
        description="Attaching autoResize to TextInputField inside an auto-width TextInput shrink-wraps the field between minWidth and maxWidth."
        code={inlineWidthCode}
    >
        <div class="flex flex-wrap items-center gap-3">
            <TextInput variant="soft" size="sm" class="w-auto">
                <TextInputIcon icon={Tag} />
                <TextInputField
                    bind:value={tagName}
                    placeholder="Tag..."
                    {@attach autoResize({ minWidth: "80px", maxWidth: "260px" })}
                />
            </TextInput>
        </div>
    </PreviewSection>

    <PreviewSection
        title="Reactive Enabled Toggle"
        description="Pass a getter to enabled so the attachment tears down cleanly when disabled and re-applies when enabled."
        code={enabledCode}
    >
        <div class="w-full max-w-lg flex flex-col gap-3">
            <label class="flex items-center gap-3 text-sm text-main select-none w-fit">
                <Switch size="md" bind:checked={isEnabled} />
                <span>Auto-resize {isEnabled ? "enabled" : "disabled"}</span>
            </label>
            <TextArea
                variant="soft"
                size="md"
                rows={2}
                bind:value={toggleValue}
                {@attach autoResize({ maxRows: 6, enabled: () => isEnabled })}
            />
        </div>
    </PreviewSection>
</div>
