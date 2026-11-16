<script module>
    export const id = "tooltip";
    export const label = "Tooltip";
</script>

<script lang="ts">
    import { Bold, Info, Italic, Plus, Settings, Share2, Trash2, Underline } from "@lucide/svelte";
    import { Button, ButtonIcon, ButtonLabel } from "cs/svelte/button";
    import { HitArea } from "cs/svelte/hit-area";
    import { Kbd, KbdGroup, KbdSeparator } from "cs/svelte/kbd";
    import { ToggleButton, ToggleButtonIcon } from "cs/svelte/toggle-button";
    import { ToggleButtonGroup, ToggleButtonGroupSeparator } from "cs/svelte/toggle-button-group";
    import { Tooltip, tooltip, TooltipIcon, TooltipText } from "cs/svelte/tooltip";
    import { PreviewHeader, PreviewSection } from "../../../playground/components/index.ts";

    let activeFormatting = $state<string[]>(["bold"]);

    const closeScript = ["</", "script>"].join("");

    /* eslint-disable unicorn/no-incorrect-template-string-interpolation -- Svelte code snippets contain literal {Component} bindings */
    const basicCode = `<script lang="ts">
    import { Plus } from "@lucide/svelte";
    import { Button, ButtonIcon } from "cs/svelte/button";
    import { HitArea } from "cs/svelte/hit-area";
    import { tooltip } from "cs/svelte/tooltip";
${closeScript}

<Button
    variant="tertiary"
    size="md"
    iconOnly
    aria-label="Add item"
    {@attach tooltip({ text: "Add item" })}
>
    <ButtonIcon icon={Plus} />
    <HitArea size="md" />
</Button>`;

    const shortcutsCode = `<ToggleButton
    variant="soft"
    color="accent"
    size="md"
    value="bold"
    iconOnly
    aria-label="Bold"
    {@attach tooltip({ target: "bold-tooltip", placement: "top" })}
>
    <ToggleButtonIcon icon={Bold} />
    <HitArea size="md" />
</ToggleButton>

<Tooltip id="bold-tooltip">
    <TooltipText>Bold</TooltipText>
    <KbdGroup variant="soft" size="sm">
        <Kbd symbol="ctrl" />
        <KbdSeparator />
        <Kbd>B</Kbd>
    </KbdGroup>
</Tooltip>`;

    const compoundCode = `<Button
    variant="tertiary"
    size="md"
    {@attach tooltip({ target: "save-tooltip", placement: "top" })}
>
    <ButtonLabel>Compound</ButtonLabel>
</Button>

<Tooltip id="save-tooltip">
    <div class="flex items-start gap-2.5">
        <TooltipIcon icon={Info} class="mt-0.5" />
        <div class="flex flex-col gap-0.5">
            <TooltipText>Save changes</TooltipText>
            <span class="text-xs text-weak">Syncs your current workspace</span>
        </div>
        <KbdGroup variant="soft" size="sm">
            <Kbd symbol="ctrl" />
            <KbdSeparator />
            <Kbd>S</Kbd>
        </KbdGroup>
    </div>
</Tooltip>`;
    /* eslint-enable unicorn/no-incorrect-template-string-interpolation */
</script>

<div class="flex flex-col gap-10">
    <PreviewHeader
        title="Tooltip"
        description="Anchor-positioned hint popovers with optional icons and keyboard shortcuts."
    />

    <PreviewSection title="Basic" code={basicCode}>
        <Button
            variant="tertiary"
            size="md"
            iconOnly
            aria-label="Add item"
            {@attach tooltip({ text: "Add item" })}
        >
            <ButtonIcon icon={Plus} />
            <HitArea size="md" />
        </Button>

        <Button
            variant="tertiary"
            size="md"
            iconOnly
            aria-label="Delete"
            {@attach tooltip({ text: "Delete" })}
        >
            <ButtonIcon icon={Trash2} />
            <HitArea size="md" />
        </Button>

        <Button
            variant="tertiary"
            size="md"
            iconOnly
            aria-label="Settings"
            {@attach tooltip({ text: "Settings" })}
        >
            <ButtonIcon icon={Settings} />
            <HitArea size="md" />
        </Button>

        <Button
            variant="tertiary"
            size="md"
            iconOnly
            aria-label="Share"
            {@attach tooltip({ text: "Share" })}
        >
            <ButtonIcon icon={Share2} />
            <HitArea size="md" />
        </Button>
    </PreviewSection>

    <PreviewSection
        title="Shortcuts & Warm Scrubbing"
        description="Move between grouped controls to preview instant tooltip transitions with keyboard shortcuts."
        code={shortcutsCode}
    >
        <ToggleButtonGroup type="multiple" orientation="horizontal" bind:value={activeFormatting}>
            <ToggleButton
                variant="soft"
                color="accent"
                size="md"
                value="bold"
                iconOnly
                aria-label="Bold"
                {@attach tooltip({ target: "preview-bold-tooltip", placement: "top" })}
            >
                <ToggleButtonIcon icon={Bold} />
                <HitArea size="md" />
            </ToggleButton>

            <ToggleButtonGroupSeparator />

            <ToggleButton
                variant="soft"
                color="accent"
                size="md"
                value="italic"
                iconOnly
                aria-label="Italic"
                {@attach tooltip({ target: "preview-italic-tooltip", placement: "top" })}
            >
                <ToggleButtonIcon icon={Italic} />
                <HitArea size="md" />
            </ToggleButton>

            <ToggleButtonGroupSeparator />

            <ToggleButton
                variant="soft"
                color="accent"
                size="md"
                value="underline"
                iconOnly
                aria-label="Underline"
                {@attach tooltip({ target: "preview-underline-tooltip", placement: "top" })}
            >
                <ToggleButtonIcon icon={Underline} />
                <HitArea size="md" />
            </ToggleButton>
        </ToggleButtonGroup>

        <Tooltip id="preview-bold-tooltip">
            <TooltipText>Bold</TooltipText>
            <KbdGroup variant="soft" size="sm">
                <Kbd symbol="ctrl" />
                <KbdSeparator />
                <Kbd>B</Kbd>
            </KbdGroup>
        </Tooltip>

        <Tooltip id="preview-italic-tooltip">
            <TooltipText>Italic</TooltipText>
            <KbdGroup variant="soft" size="sm">
                <Kbd symbol="ctrl" />
                <KbdSeparator />
                <Kbd>I</Kbd>
            </KbdGroup>
        </Tooltip>

        <Tooltip id="preview-underline-tooltip">
            <TooltipText>Underline</TooltipText>
            <KbdGroup variant="soft" size="sm">
                <Kbd symbol="ctrl" />
                <KbdSeparator />
                <Kbd>U</Kbd>
            </KbdGroup>
        </Tooltip>
    </PreviewSection>

    <PreviewSection
        title="Props & Compound"
        description="Render rich tooltips using shorthand props or explicit Tooltip subcomponents."
        code={compoundCode}
    >
        <Button
            variant="tertiary"
            size="md"
            {@attach tooltip({ target: "preview-rich-tooltip", placement: "top" })}
        >
            <ButtonLabel>Props</ButtonLabel>
        </Button>
        <Tooltip id="preview-rich-tooltip" text="Save changes" icon={Info} />

        <Button
            variant="tertiary"
            size="md"
            {@attach tooltip({ target: "preview-compound-tooltip", placement: "top" })}
        >
            <ButtonLabel>Compound</ButtonLabel>
        </Button>
        <Tooltip id="preview-compound-tooltip">
            <div class="flex items-start gap-2.5">
                <TooltipIcon icon={Info} class="mt-0.5" />
                <div class="flex flex-col gap-0.5">
                    <TooltipText>Save changes</TooltipText>
                    <span class="text-xs text-weak">Syncs your current workspace</span>
                </div>
                <KbdGroup variant="soft" size="sm">
                    <Kbd symbol="ctrl" />
                    <KbdSeparator />
                    <Kbd>S</Kbd>
                </KbdGroup>
            </div>
        </Tooltip>
    </PreviewSection>
</div>
