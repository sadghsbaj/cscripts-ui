<script module>
    export const id = "clipboard";
    export const label = "Clipboard";
</script>

<script lang="ts">
    import { BUTTON_SIZES, Button, ButtonLabel } from "cs/svelte/button";
    import { CopyIcon, copyOnClick, PasteIcon, pasteOnClick } from "cs/svelte/clipboard";
    import { HitArea } from "cs/svelte/hit-area";
    import { tooltip } from "cs/svelte/tooltip";
    import { PreviewHeader, PreviewSection } from "../../components/index.ts";

    let pasteValue = $state("");

    const closeScript = ["</", "script>"].join("");

    /* eslint-disable unicorn/no-incorrect-template-string-interpolation -- Svelte code snippets contain literal {Component} bindings */
    const basicCode = `<script lang="ts">
    import { Button } from "cs/svelte/button";
    import { CopyIcon, copyOnClick } from "cs/svelte/clipboard";
    import { HitArea } from "cs/svelte/hit-area";
    import { tooltip } from "cs/svelte/tooltip";
${closeScript}

<Button
    variant="tertiary"
    size="md"
    iconOnly
    aria-label="Copy"
    {@attach copyOnClick("bun add cs")}
    {@attach tooltip("Copy")}
>
    <CopyIcon />
    <HitArea size="md" />
</Button>`;

    const labelCode = `<Button variant="tertiary" size="md" {@attach copyOnClick("bun add cs")}>
    <CopyIcon />
    <ButtonLabel>Copy command</ButtonLabel>
</Button>
<Button
    variant="primary"
    size="md"
    style="--cs-copy-icon-check-color: currentColor;"
    {@attach copyOnClick("bun add cs")}
>
    <CopyIcon />
    <ButtonLabel>Primary</ButtonLabel>
</Button>
<Button variant="ghost" size="md" {@attach copyOnClick("bun add cs")}>
    <CopyIcon />
    <ButtonLabel>Ghost</ButtonLabel>
</Button>`;

    const pasteCode = `<input bind:value={pasteValue} placeholder="Paste target..." />

<Button
    variant="tertiary"
    size="md"
    iconOnly
    aria-label="Paste"
    {@attach pasteOnClick({
        mode: "replace",
        target: (e) => {
            pasteValue = e.text;
        },
    })}
    {@attach tooltip("Paste")}
>
    <PasteIcon />
    <HitArea size="md" />
</Button>`;

    const sizesCode = `<Button
    variant="tertiary"
    size="md"
    iconOnly
    aria-label="Copy"
    {@attach copyOnClick("Copied")}
    {@attach tooltip("Copy")}
>
    <CopyIcon />
    <HitArea size="md" />
</Button>`;

    const errorCode = `<Button
    variant="secondary"
    danger
    size="md"
    {@attach copyOnClick(() => Promise.reject(new Error("Simulated failure")))}
>
    <CopyIcon />
    <ButtonLabel>Fail copy</ButtonLabel>
</Button>

<Button
    variant="secondary"
    danger
    size="md"
    {@attach pasteOnClick(() => Promise.reject(new Error("Simulated failure")))}
>
    <PasteIcon />
    <ButtonLabel>Fail paste</ButtonLabel>
</Button>`;
    /* eslint-enable unicorn/no-incorrect-template-string-interpolation */
</script>

<div class="flex flex-col gap-10">
    <PreviewHeader
        title="Clipboard"
        description="Attachments and animated icon primitives for one-click copy and paste feedback."
    />

    <PreviewSection title="Basic" code={basicCode}>
        <Button
            variant="tertiary"
            size="md"
            iconOnly
            aria-label="Copy"
            {@attach copyOnClick("bun add cs")}
            {@attach tooltip("Copy")}
        >
            <CopyIcon />
            <HitArea size="md" />
        </Button>
    </PreviewSection>

    <PreviewSection title="With Label" code={labelCode}>
        <Button variant="tertiary" size="md" {@attach copyOnClick("bun add cs")}>
            <CopyIcon />
            <ButtonLabel>Copy command</ButtonLabel>
        </Button>

        <Button
            variant="primary"
            size="md"
            style="--cs-copy-icon-check-color: currentColor;"
            {@attach copyOnClick("bun add cs")}
        >
            <CopyIcon />
            <ButtonLabel>Primary</ButtonLabel>
        </Button>

        <Button variant="ghost" size="md" {@attach copyOnClick("bun add cs")}>
            <CopyIcon />
            <ButtonLabel>Ghost</ButtonLabel>
        </Button>
    </PreviewSection>

    <PreviewSection
        title="Paste into Input"
        description="Read text from the clipboard into a reactive state binding."
        code={pasteCode}
    >
        <div class="flex flex-col gap-3 w-full max-w-sm">
            <div class="flex gap-2 items-center w-full">
                <input
                    bind:value={pasteValue}
                    placeholder="Paste target..."
                    class="bg-base-soft rounded-xl px-3 h-36px w-full text-sm text-main outline-none"
                />
                <Button
                    variant="tertiary"
                    size="md"
                    iconOnly
                    aria-label="Paste"
                    {@attach pasteOnClick({
                        mode: "replace",
                        target: (e) => {
                            pasteValue = e.text;
                        },
                    })}
                    {@attach tooltip("Paste")}
                >
                    <PasteIcon />
                    <HitArea size="md" />
                </Button>
            </div>

            <div class="flex items-center gap-2">
                <Button variant="tertiary" size="sm" {@attach copyOnClick("")}>
                    <CopyIcon />
                    <ButtonLabel>Copy empty</ButtonLabel>
                </Button>
            </div>
        </div>
    </PreviewSection>

    <PreviewSection title="Icon-Only Sizes" code={sizesCode}>
        <div class="flex flex-col gap-4 items-center">
            <div class="flex flex-wrap gap-3 items-center">
                {#each BUTTON_SIZES as size (size)}
                    <Button
                        variant="tertiary"
                        {size}
                        iconOnly
                        aria-label="Copy"
                        {@attach copyOnClick(`Copied size: ${size}`)}
                        {@attach tooltip(`Copy (${size})`)}
                    >
                        <CopyIcon />
                        <HitArea size="md" />
                    </Button>
                {/each}
            </div>

            <div class="flex flex-wrap gap-3 items-center">
                {#each BUTTON_SIZES as size (size)}
                    <Button
                        variant="tertiary"
                        {size}
                        iconOnly
                        aria-label="Paste"
                        {@attach pasteOnClick((e) => {
                            pasteValue = e.text;
                        })}
                        {@attach tooltip(`Paste (${size})`)}
                    >
                        <PasteIcon />
                        <HitArea size="md" />
                    </Button>
                {/each}
            </div>
        </div>
    </PreviewSection>

    <PreviewSection
        title="Error Feedback"
        description="Displays transient error icon feedback when clipboard access rejects."
        code={errorCode}
    >
        <Button
            variant="tertiary"
            size="md"
            iconOnly
            aria-label="Simulate copy error"
            {@attach copyOnClick(() => Promise.reject(new Error("Simulated failure")))}
            {@attach tooltip("Test error")}
        >
            <CopyIcon />
            <HitArea size="md" />
        </Button>

        <Button
            variant="secondary"
            danger
            size="md"
            {@attach copyOnClick(() => Promise.reject(new Error("Simulated failure")))}
        >
            <CopyIcon />
            <ButtonLabel>Fail copy</ButtonLabel>
        </Button>

        <Button
            variant="secondary"
            danger
            size="md"
            {@attach pasteOnClick(() => Promise.reject(new Error("Simulated failure")))}
        >
            <PasteIcon />
            <ButtonLabel>Fail paste</ButtonLabel>
        </Button>
    </PreviewSection>
</div>
