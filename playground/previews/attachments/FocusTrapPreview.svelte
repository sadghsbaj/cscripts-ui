<script module lang="ts">
    export const id = "focus-trap";
    export const label = "Focus-Trap";
</script>

<script lang="ts">
    import { Button, ButtonLabel } from "cs/svelte/button";
    import { CloseButton } from "cs/svelte/close-button";
    import { focusTrap } from "cs/svelte/focus";
    import { HitArea } from "cs/svelte/hit-area";
    import { Overlay } from "cs/svelte/overlay";
    import { PreviewHeader, PreviewSection } from "../../components/index.ts";

    let isStandardOpen = $state(false);
    let isTargetOpen = $state(false);
    let isParentOpen = $state(false);
    let isChildOpen = $state(false);

    const closeScript = ["</", "script>"].join("");

    const standardCode = `<script lang="ts">
    import { focusTrap } from "cs/svelte/focus";
    import { Overlay } from "cs/svelte/overlay";

    let isOpen = $state(false);
${closeScript}

{#if isOpen}
    <Overlay variant="blur" onclick={() => (isOpen = false)}>
        <div
            role="dialog"
            aria-modal="true"
            {@attach focusTrap({
                initialFocus: "first-focusable",
                onEscape: () => (isOpen = false),
                allowOutsideClick: true,
            })}
        >
            <!-- Dialog content -->
        </div>
    </Overlay>
{/if}`;

    const targetCode = `<div
    role="dialog"
    aria-modal="true"
    {@attach focusTrap({
        initialFocus: "#danger-confirm",
        onEscape: () => (isOpen = false),
    })}
>
    <button id="danger-confirm">Delete</button>
</div>`;

    const nestedCode = `<!-- Stacked focus traps pause parent traps automatically -->
<div {@attach focusTrap({ initialFocus: "first-focusable", onEscape: () => (isParentOpen = false) })}>
    ...
</div>

<div {@attach focusTrap({ initialFocus: "first-focusable", onEscape: () => (isChildOpen = false) })}>
    ...
</div>`;
</script>

<div class="flex flex-col gap-10">
    <PreviewHeader
        title="focusTrap"
        description="Confines keyboard Tab navigation inside modals and supports Escape handling and nested trap stacks."
    />

    <PreviewSection
        title="Standard Dialog Trap"
        description="Cycles Tab focus within the dialog and closes on Escape or backdrop click."
        code={standardCode}
    >
        <Button variant="primary" size="md" onclick={() => (isStandardOpen = true)}>
            <ButtonLabel>Open modal</ButtonLabel>
        </Button>
    </PreviewSection>

    <PreviewSection
        title="Targeted Initial Focus"
        description="Pass a CSS selector to initialFocus to focus a specific control when mounted."
        code={targetCode}
    >
        <Button variant="secondary" danger size="md" onclick={() => (isTargetOpen = true)}>
            <ButtonLabel>Confirm deletion</ButtonLabel>
        </Button>
    </PreviewSection>

    <PreviewSection
        title="Nested Trap Stack"
        description="Opening a child dialog pauses the parent trap and restores it when closed."
        code={nestedCode}
    >
        <Button variant="tertiary" size="md" onclick={() => (isParentOpen = true)}>
            <ButtonLabel>Open multi-level</ButtonLabel>
        </Button>
    </PreviewSection>
</div>

{#if isStandardOpen}
    <Overlay variant="blur" onclick={() => (isStandardOpen = false)}>
        <div
            role="dialog"
            aria-modal="true"
            aria-label="Settings"
            class="bg-elevated shadow-elevated rounded-3xl squircle p-6 flex flex-col gap-6 w-full max-w-400px relative"
            {@attach focusTrap({
                initialFocus: "first-focusable",
                onEscape: () => (isStandardOpen = false),
                allowOutsideClick: true,
            })}
        >
            <div class="flex justify-between items-center w-full">
                <h3 class="title-xl text-strong">Settings</h3>
                <CloseButton
                    variant="soft"
                    size="sm"
                    onclick={() => (isStandardOpen = false)}
                    class="absolute top-6 right-6"
                >
                    <HitArea size="md" />
                </CloseButton>
            </div>

            <div class="flex flex-col gap-3">
                <input
                    type="text"
                    placeholder="Username"
                    class="bg-sunken shadow-sunken rounded-full squircle-smooth px-3.5 h-36px w-full text-sm outline-none text-main placeholder:text-weaker"
                />
                <input
                    type="password"
                    placeholder="Password"
                    class="bg-sunken shadow-sunken rounded-full squircle-smooth px-3.5 h-36px w-full text-sm outline-none text-main placeholder:text-weaker"
                />
            </div>

            <div class="flex justify-end gap-3 w-full">
                <Button variant="tertiary" size="md" onclick={() => (isStandardOpen = false)}>
                    <ButtonLabel>Cancel</ButtonLabel>
                </Button>
                <Button variant="primary" size="md" onclick={() => (isStandardOpen = false)}>
                    <ButtonLabel>Save</ButtonLabel>
                </Button>
            </div>
        </div>
    </Overlay>
{/if}

{#if isTargetOpen}
    <Overlay variant="dim" onclick={() => (isTargetOpen = false)}>
        <div
            role="dialog"
            aria-modal="true"
            aria-label="Confirm deletion"
            class="bg-elevated shadow-elevated rounded-3xl squircle p-6 flex flex-col gap-6 w-full max-w-380px relative"
            {@attach focusTrap({
                initialFocus: "#danger-confirm",
                onEscape: () => (isTargetOpen = false),
            })}
        >
            <div class="flex justify-between items-center w-full">
                <h3 class="title-xl text-strong">Delete this item?</h3>
                <CloseButton
                    variant="soft"
                    size="sm"
                    onclick={() => (isTargetOpen = false)}
                    class="absolute right-4 top-4"
                >
                    <HitArea size="md" />
                </CloseButton>
            </div>

            <p class="text-sm text-weak">
                This action cannot be undone. Initial focus is placed directly on the destructive action.
            </p>

            <div class="flex justify-end gap-3 w-full">
                <Button variant="tertiary" size="md" onclick={() => (isTargetOpen = false)}>
                    <ButtonLabel>Cancel</ButtonLabel>
                </Button>
                <Button
                    id="danger-confirm"
                    variant="primary"
                    danger
                    size="md"
                    onclick={() => (isTargetOpen = false)}
                >
                    <ButtonLabel>Delete</ButtonLabel>
                </Button>
            </div>
        </div>
    </Overlay>
{/if}

{#if isParentOpen}
    <Overlay variant="dim" onclick={() => (isParentOpen = false)}>
        <div
            role="dialog"
            aria-modal="true"
            aria-label="Level 1 dialog"
            class="bg-elevated shadow-elevated rounded-3xl squircle p-6 flex flex-col gap-6 w-full max-w-440px relative"
            {@attach focusTrap({
                initialFocus: "first-focusable",
                onEscape: () => (isParentOpen = false),
            })}
        >
            <div class="flex justify-between items-center w-full">
                <h3 class="title-xl text-strong">Level 1: Main Dialog</h3>
                <CloseButton
                    variant="soft"
                    size="sm"
                    onclick={() => (isParentOpen = false)}
                    class="absolute top-6 right-6"
                >
                    <HitArea size="md" />
                </CloseButton>
            </div>

            <p class="text-sm text-weak">
                Opening the child dialog automatically pauses this trap and resumes it once the child closes.
            </p>

            <div class="flex justify-between items-center w-full">
                <Button variant="secondary" size="sm" onclick={() => (isChildOpen = true)}>
                    <ButtonLabel>Open level 2</ButtonLabel>
                </Button>
                <Button variant="tertiary" size="md" onclick={() => (isParentOpen = false)}>
                    <ButtonLabel>Close</ButtonLabel>
                </Button>
            </div>
        </div>
    </Overlay>
{/if}

{#if isChildOpen}
    <Overlay variant="blur" onclick={() => (isChildOpen = false)}>
        <div
            role="dialog"
            aria-modal="true"
            aria-label="Level 2 sub-dialog"
            class="bg-elevated shadow-elevated rounded-3xl squircle p-8 flex flex-col gap-6 w-full max-w-360px relative"
            {@attach focusTrap({
                initialFocus: "first-focusable",
                onEscape: () => (isChildOpen = false),
            })}
        >
            <div class="flex justify-between items-center w-full">
                <h3 class="title-xl text-strong">Level 2: Sub-Dialog</h3>
                <CloseButton
                    variant="ghost"
                    size="sm"
                    onclick={() => (isChildOpen = false)}
                    class="absolute top-6 right-6"
                >
                    <HitArea size="sm" />
                </CloseButton>
            </div>

            <p class="text-sm text-weak">Focus is trapped here. Pressing Escape closes only this sub-dialog.</p>

            <div class="flex justify-end gap-3 w-full">
                <Button variant="primary" size="sm" onclick={() => (isChildOpen = false)}>
                    <ButtonLabel>Done</ButtonLabel>
                </Button>
            </div>
        </div>
    </Overlay>
{/if}
