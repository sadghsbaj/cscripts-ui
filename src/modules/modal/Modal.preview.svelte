<script module lang="ts">
    export const id = "modal";
    export const label = "Modal";
</script>

<script lang="ts">
    import { Button, ButtonLabel } from "cs/svelte/button";
    import { autoFocus } from "cs/svelte/focus";
    import {
        Modal,
        MODAL_SIZES,
        ModalActions,
        ModalBody,
        ModalClose,
        ModalDescription,
        ModalFooter,
        ModalHeader,
        ModalSubtitle,
        ModalTitle,
        type ModalActionsAlign,
        type ModalActionsOrientation,
        type ModalSize,
    } from "cs/svelte/modal";
    import { Overlay } from "cs/svelte/overlay";
    import { ScrollArea, ScrollAreaContent } from "cs/svelte/scroll-area";
    import { scrollFade } from "cs/svelte/scroll-fade";
    import { Switch } from "cs/svelte/switch";
    import { TextInput, TextInputField } from "cs/svelte/text-input";
    import { PreviewHeader, PreviewSection } from "../../../playground/components/index.ts";

    let standardOpen = $state(false);
    let standardModal = $state<Modal | undefined>();
    let projectName = $state("Acme App");
    const projectInputId = $props.id();

    let sizeOpen = $state(false);
    let activeSize = $state<ModalSize>("md");
    let sizeModal = $state<Modal | undefined>();

    let actionsOpen = $state(false);
    let actionsAlign = $state<ModalActionsAlign>("end");
    let actionsOrientation = $state<ModalActionsOrientation>("horizontal");
    let actionsModal = $state<Modal | undefined>();

    let scrollOpen = $state(false);
    let scrollModal = $state<Modal | undefined>();

    let blockingOpen = $state(false);
    let blockingModal = $state<Modal | undefined>();

    let guardedOpen = $state(false);
    let guardedModal = $state<Modal | undefined>();
    let hasUnsavedChanges = $state(true);
    let guardedBlockedNotice = $state(false);

    let deleteOpen = $state(false);
    let deleteModal = $state<Modal | undefined>();

    function openSizeModal(size: ModalSize): void {
        activeSize = size;
        sizeOpen = true;
    }

    function openActionsModal(align: ModalActionsAlign, orientation: ModalActionsOrientation): void {
        actionsAlign = align;
        actionsOrientation = orientation;
        actionsOpen = true;
    }

    function openGuardedModal(): void {
        hasUnsavedChanges = true;
        guardedBlockedNotice = false;
        guardedOpen = true;
    }

    const closeScript = ["</", "script>"].join("");

    /* eslint-disable unicorn/no-incorrect-template-string-interpolation -- Svelte code snippets contain literal {Component} bindings */
    const standardCode = `<script lang="ts">
    import { Button, ButtonLabel } from "cs/svelte/button";
    import { autoFocus } from "cs/svelte/focus";
    import {
        Modal,
        ModalActions,
        ModalBody,
        ModalClose,
        ModalDescription,
        ModalFooter,
        ModalHeader,
        ModalSubtitle,
        ModalTitle,
    } from "cs/svelte/modal";
    import { Overlay } from "cs/svelte/overlay";
    import { TextInput, TextInputField } from "cs/svelte/text-input";

    let open = $state(false);
    let modal = $state<Modal | undefined>();
    let projectName = $state("Acme App");
${closeScript}

{#if open}
    <Overlay variant="blur" onclick={() => modal?.requestClose("outside-click")}>
        <Modal bind:this={modal} bind:open size="md" initialFocus={false}>
            <ModalHeader>
                <ModalSubtitle>Workspace</ModalSubtitle>
                <ModalTitle>Rename Project</ModalTitle>
                <ModalDescription>Update the project name.</ModalDescription>
            </ModalHeader>
            <ModalClose />
            <ModalBody>
                <TextInput variant="soft" size="md">
                    <TextInputField
                        bind:value={projectName}
                        {@attach autoFocus({ target: "self", select: "all" })}
                    />
                </TextInput>
            </ModalBody>
            <ModalFooter>
                <ModalActions>
                    <Button variant="tertiary" size="md" onclick={() => modal?.requestClose("programmatic")}>
                        <ButtonLabel>Cancel</ButtonLabel>
                    </Button>
                    <Button variant="primary" size="md" onclick={() => modal?.requestClose("programmatic")}>
                        <ButtonLabel>Save</ButtonLabel>
                    </Button>
                </ModalActions>
            </ModalFooter>
        </Modal>
    </Overlay>
{/if}`;

    const scrollCode = `<ModalBody>
    <ScrollArea size="sm" direction="vertical" class="h-72 max-h-full min-h-0">
        <ScrollAreaContent
            class="flex flex-col gap-3 py-1"
            {@attach scrollFade({ size: "sm", direction: "vertical", edges: "both" })}
        >
            <!-- Scrollable content -->
        </ScrollAreaContent>
    </ScrollArea>
</ModalBody>`;

    const blockingCode = `<Overlay variant="blur" onclick={() => blockingModal?.nudge()}>
    <Modal bind:this={blockingModal} bind:open={blockingOpen} size="sm" dismissible={false}>
        ...
    </Modal>
</Overlay>

<Modal
    bind:this={guardedModal}
    bind:open={guardedOpen}
    size="sm"
    onBeforeClose={() => !hasUnsavedChanges}
>
    ...
</Modal>`;
    /* eslint-enable unicorn/no-incorrect-template-string-interpolation */
</script>

<div class="flex flex-col gap-10">
    <PreviewHeader
        title="Modal"
        description="Top-layer dialog composed inside Overlay with focus trapping and Card-aligned anatomy."
    />

    <PreviewSection
        title="Standard Dialog"
        description="Compound header, body, footer, actions, and close button inside Overlay."
        code={standardCode}
    >
        <Button variant="primary" size="md" onclick={() => (standardOpen = true)}>
            <ButtonLabel>Rename project</ButtonLabel>
        </Button>
    </PreviewSection>

    <PreviewSection title="Sizes" description="Container width scale from sm to full.">
        <div class="flex flex-wrap items-center gap-2.5">
            {#each MODAL_SIZES as size (size)}
                <Button variant="secondary" size="md" onclick={() => openSizeModal(size)}>
                    <ButtonLabel class="uppercase">{size}</ButtonLabel>
                </Button>
            {/each}
        </div>
    </PreviewSection>

    <PreviewSection
        title="Footer Action Layouts"
        description="Alignment and orientation options for ModalActions."
    >
        <div class="flex flex-wrap items-center gap-2.5">
            <Button variant="secondary" size="md" onclick={() => openActionsModal("end", "horizontal")}>
                <ButtonLabel>End (horizontal)</ButtonLabel>
            </Button>
            <Button variant="secondary" size="md" onclick={() => openActionsModal("stretch", "horizontal")}>
                <ButtonLabel>Stretch (horizontal)</ButtonLabel>
            </Button>
            <Button variant="secondary" size="md" onclick={() => openActionsModal("stretch", "vertical")}>
                <ButtonLabel>Stretch (vertical)</ButtonLabel>
            </Button>
        </div>
    </PreviewSection>

    <PreviewSection
        title="Scrollable Body"
        description="ScrollArea and scrollFade inside ModalBody with pinned header and footer."
        code={scrollCode}
    >
        <Button variant="secondary" size="md" onclick={() => (scrollOpen = true)}>
            <ButtonLabel>Open release notes</ButtonLabel>
        </Button>
    </PreviewSection>

    <PreviewSection
        title="Blocking & Guarded Modals"
        description="Prevent dismissal with dismissible={false} + nudge(), or guard close with onBeforeClose."
        code={blockingCode}
    >
        <div class="flex flex-wrap items-center gap-2.5">
            <Button variant="secondary" size="md" onclick={() => (blockingOpen = true)}>
                <ButtonLabel>Blocking modal</ButtonLabel>
            </Button>
            <Button variant="secondary" size="md" onclick={openGuardedModal}>
                <ButtonLabel>Guarded modal</ButtonLabel>
            </Button>
        </div>
    </PreviewSection>

    <PreviewSection
        title="Delete Confirmation"
        description="Compact confirmation dialog with a negative primary action."
    >
        <Button variant="secondary" negative size="md" onclick={() => (deleteOpen = true)}>
            <ButtonLabel>Delete project</ButtonLabel>
        </Button>
    </PreviewSection>
</div>

<!-- 1. Standard Dialog -->
{#if standardOpen}
    <Overlay variant="blur" onclick={() => standardModal?.requestClose("outside-click")}>
        <Modal bind:this={standardModal} bind:open={standardOpen} size="md" initialFocus={false}>
            <ModalHeader>
                <ModalSubtitle>Workspace</ModalSubtitle>
                <ModalTitle>Rename Project</ModalTitle>
                <ModalDescription>Update the project name.</ModalDescription>
            </ModalHeader>
            <ModalClose />
            <ModalBody>
                <div class="flex flex-col gap-1.5">
                    <label for={projectInputId} class="text-xs font-medium text-weak">Project name</label>
                    <TextInput variant="soft" size="md">
                        <TextInputField
                            id={projectInputId}
                            bind:value={projectName}
                            placeholder="Project name"
                            {@attach autoFocus({ target: "self", select: "all" })}
                        />
                    </TextInput>
                </div>
            </ModalBody>
            <ModalFooter>
                <ModalActions>
                    <Button variant="tertiary" size="md" onclick={() => standardModal?.requestClose("programmatic")}>
                        <ButtonLabel>Cancel</ButtonLabel>
                    </Button>
                    <Button variant="primary" size="md" onclick={() => standardModal?.requestClose("programmatic")}>
                        <ButtonLabel>Save</ButtonLabel>
                    </Button>
                </ModalActions>
            </ModalFooter>
        </Modal>
    </Overlay>
{/if}

<!-- 2. Sizes -->
{#if sizeOpen}
    <Overlay variant="blur" onclick={() => sizeModal?.requestClose("outside-click")}>
        <Modal bind:this={sizeModal} bind:open={sizeOpen} size={activeSize}>
            <ModalHeader>
                <ModalSubtitle>Size</ModalSubtitle>
                <ModalTitle class="uppercase">{activeSize}</ModalTitle>
                <ModalDescription>Switch sizes to compare container widths.</ModalDescription>
            </ModalHeader>
            <ModalClose />
            <ModalBody>
                <div class="flex flex-wrap gap-2">
                    {#each MODAL_SIZES as size (size)}
                        <Button
                            variant={size === activeSize ? "primary" : "secondary"}
                            size="sm"
                            onclick={() => (activeSize = size)}
                        >
                            <ButtonLabel class="uppercase">{size}</ButtonLabel>
                        </Button>
                    {/each}
                </div>
            </ModalBody>
            <ModalFooter>
                <ModalActions>
                    <Button variant="primary" size="md" onclick={() => sizeModal?.requestClose("programmatic")}>
                        <ButtonLabel>Done</ButtonLabel>
                    </Button>
                </ModalActions>
            </ModalFooter>
        </Modal>
    </Overlay>
{/if}

<!-- 3. Footer Action Layouts -->
{#if actionsOpen}
    <Overlay variant="blur" onclick={() => actionsModal?.requestClose("outside-click")}>
        <Modal bind:this={actionsModal} bind:open={actionsOpen} size="sm">
            <ModalHeader>
                <ModalSubtitle>{actionsAlign} / {actionsOrientation}</ModalSubtitle>
                <ModalTitle>Archive project?</ModalTitle>
                <ModalDescription>Members will lose access until it is restored.</ModalDescription>
            </ModalHeader>
            <ModalClose />
            <ModalFooter>
                <ModalActions align={actionsAlign} orientation={actionsOrientation} class="w-full">
                    <Button variant="tertiary" size="md" onclick={() => actionsModal?.requestClose("programmatic")}>
                        <ButtonLabel>Cancel</ButtonLabel>
                    </Button>
                    <Button variant="primary" size="md" onclick={() => actionsModal?.requestClose("programmatic")}>
                        <ButtonLabel>Archive</ButtonLabel>
                    </Button>
                </ModalActions>
            </ModalFooter>
        </Modal>
    </Overlay>
{/if}

<!-- 4. Scrollable Body -->
{#if scrollOpen}
    <Overlay variant="blur" onclick={() => scrollModal?.requestClose("outside-click")}>
        <Modal bind:this={scrollModal} bind:open={scrollOpen} size="md">
            <ModalHeader>
                <ModalSubtitle>Changelog</ModalSubtitle>
                <ModalTitle>Release Notes</ModalTitle>
                <ModalDescription>Recent updates and improvements.</ModalDescription>
            </ModalHeader>
            <ModalClose />
            <ModalBody>
                <ScrollArea size="sm" direction="vertical" class="h-72 max-h-full min-h-0">
                    <ScrollAreaContent
                        class="flex flex-col gap-3 py-1"
                        {@attach scrollFade({ size: "sm", direction: "vertical", edges: "both" })}
                    >
                        {#each Array.from({ length: 12 }, (_, index) => index + 1) as item (item)}
                            <div class="bg-sunken rounded-2xl squircle p-4 flex flex-col gap-1">
                                <span class="text-sm font-semibold text-strong">v1.{12 - item + 1}.0</span>
                                <span class="text-xs text-weak">Performance improvements and stability fixes.</span>
                            </div>
                        {/each}
                    </ScrollAreaContent>
                </ScrollArea>
            </ModalBody>
            <ModalFooter>
                <span class="text-xs text-weak">12 releases</span>
                <ModalActions>
                    <Button variant="primary" size="md" onclick={() => scrollModal?.requestClose("programmatic")}>
                        <ButtonLabel>Close</ButtonLabel>
                    </Button>
                </ModalActions>
            </ModalFooter>
        </Modal>
    </Overlay>
{/if}

<!-- 5a. Blocking Modal -->
{#if blockingOpen}
    <Overlay variant="blur" onclick={() => blockingModal?.nudge()}>
        <Modal bind:this={blockingModal} bind:open={blockingOpen} size="sm" dismissible={false}>
            <ModalHeader>
                <ModalSubtitle>Required</ModalSubtitle>
                <ModalTitle>Confirm Action</ModalTitle>
                <ModalDescription>Complete this step to continue.</ModalDescription>
            </ModalHeader>
            <ModalFooter>
                <ModalActions align="stretch" orientation="horizontal" class="w-full">
                    <Button variant="primary" size="md" onclick={() => (blockingOpen = false)}>
                        <ButtonLabel>Continue</ButtonLabel>
                    </Button>
                </ModalActions>
            </ModalFooter>
        </Modal>
    </Overlay>
{/if}

<!-- 5b. Guarded Modal -->
{#if guardedOpen}
    <Overlay variant="blur" onclick={() => guardedModal?.requestClose("outside-click")}>
        <Modal
            bind:this={guardedModal}
            bind:open={guardedOpen}
            size="sm"
            onBeforeClose={() => {
                if (hasUnsavedChanges) {
                    guardedBlockedNotice = true;
                    return false;
                }
                return true;
            }}
        >
            <ModalHeader>
                <ModalSubtitle>Settings</ModalSubtitle>
                <ModalTitle>Edit Configuration</ModalTitle>
                <ModalDescription>Save or discard changes before closing.</ModalDescription>
            </ModalHeader>
            <ModalClose />
            <ModalBody>
                <label class="flex items-center justify-between gap-3 rounded-2xl squircle bg-sunken p-3.5 text-sm text-main select-none">
                    <span>Unsaved changes</span>
                    <Switch
                        size="sm"
                        bind:checked={hasUnsavedChanges}
                        onchange={() => {
                            if (!hasUnsavedChanges) guardedBlockedNotice = false;
                        }}
                    />
                </label>
                {#if guardedBlockedNotice && hasUnsavedChanges}
                    <p class="m-0 text-xs font-medium text-negative">
                        Save or discard your changes before closing.
                    </p>
                {/if}
            </ModalBody>
            <ModalFooter>
                <ModalActions align="end" orientation="horizontal" class="w-full">
                    <Button
                        variant="tertiary"
                        size="md"
                        onclick={() => {
                            hasUnsavedChanges = false;
                            guardedBlockedNotice = false;
                            void guardedModal?.requestClose("programmatic");
                        }}
                    >
                        <ButtonLabel>Discard</ButtonLabel>
                    </Button>
                    <Button
                        variant="primary"
                        size="md"
                        onclick={() => {
                            hasUnsavedChanges = false;
                            guardedBlockedNotice = false;
                            void guardedModal?.requestClose("programmatic");
                        }}
                    >
                        <ButtonLabel>Save</ButtonLabel>
                    </Button>
                </ModalActions>
            </ModalFooter>
        </Modal>
    </Overlay>
{/if}

<!-- 6. Delete Confirmation -->
{#if deleteOpen}
    <Overlay variant="blur" onclick={() => deleteModal?.requestClose("outside-click")}>
        <Modal bind:this={deleteModal} bind:open={deleteOpen} size="sm">
            <ModalHeader>
                <ModalTitle>Delete project?</ModalTitle>
                <ModalDescription>This will permanently remove Acme App and its deployment history.</ModalDescription>
            </ModalHeader>
            <ModalClose />
            <ModalFooter>
                <ModalActions>
                    <Button variant="tertiary" size="md" onclick={() => deleteModal?.requestClose("programmatic")}>
                        <ButtonLabel>Cancel</ButtonLabel>
                    </Button>
                    <Button
                        variant="primary"
                        negative
                        size="md"
                        onclick={() => deleteModal?.requestClose("programmatic")}
                    >
                        <ButtonLabel>Delete</ButtonLabel>
                    </Button>
                </ModalActions>
            </ModalFooter>
        </Modal>
    </Overlay>
{/if}
