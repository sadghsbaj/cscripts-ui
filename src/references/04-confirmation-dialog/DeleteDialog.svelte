<script lang="ts">
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
        ModalTitle,
    } from "cs/svelte/modal";
    import { Overlay } from "cs/svelte/overlay";
    import { TextInput, TextInputField } from "cs/svelte/text-input";

    export interface DeleteDialogProps {
        open?: boolean;
        title?: string;
        description?: string;
        confirmText?: string;
        cancelLabel?: string;
        deleteLabel?: string;
        onconfirm?: () => void | Promise<void>;
        oncancel?: () => void;
    }

    let {
        open = $bindable(false),
        title = "Delete project?",
        description = "This cannot be undone.",
        confirmText = "acme",
        cancelLabel = "Cancel",
        deleteLabel = "Delete",
        onconfirm,
        oncancel,
    }: DeleteDialogProps = $props();

    const inputId = $props.id();

    let modal = $state<Modal | undefined>();
    let typedValue = $state("");
    let isSubmitting = $state(false);
    let confirmed = false;

    const canConfirm = $derived(!confirmText || typedValue === confirmText);

    $effect(() => {
        if (!open) {
            typedValue = "";
        }
    });

    function handleModalClose(): void {
        if (!confirmed) {
            oncancel?.();
        }
    }

    function handleCancel(): void {
        if (isSubmitting) return;
        void modal?.requestClose("programmatic");
    }

    async function handleSubmit(event: SubmitEvent): Promise<void> {
        event.preventDefault();
        if (!canConfirm || isSubmitting) return;
        isSubmitting = true;
        try {
            await onconfirm?.();
            confirmed = true;
            await modal?.requestClose("programmatic");
        } finally {
            isSubmitting = false;
            confirmed = false;
        }
    }
</script>

{#if open}
    <Overlay variant="blur" onclick={() => modal?.requestClose("outside-click")}>
        <Modal
            bind:this={modal}
            bind:open
            size="sm"
            dismissible={!isSubmitting}
            initialFocus={confirmText ? false : "first-focusable"}
            onClose={handleModalClose}
        >
            <ModalHeader>
                <ModalTitle>{title}</ModalTitle>
                <ModalDescription>{description}</ModalDescription>
            </ModalHeader>
            <ModalClose disabled={isSubmitting} />
            <form class="flex flex-col gap-[var(--cs-modal-gap)]" onsubmit={handleSubmit}>
                {#if confirmText}
                    <ModalBody>
                        <div class="flex flex-col gap-1.5">
                            <label for={inputId} class="label-sm">
                                Type <span class="font-600 text-strong">{confirmText}</span> to confirm
                            </label>
                            <TextInput variant="soft" size="md" disabled={isSubmitting}>
                                <TextInputField
                                    id={inputId}
                                    placeholder={confirmText}
                                    autocomplete="off"
                                    bind:value={typedValue}
                                    {@attach autoFocus({ target: "self" })}
                                />
                            </TextInput>
                        </div>
                    </ModalBody>
                {/if}
                <ModalFooter>
                    <ModalActions>
                        <Button
                            variant="tertiary"
                            size="md"
                            type="button"
                            disabled={isSubmitting}
                            onclick={handleCancel}
                        >
                            <ButtonLabel>{cancelLabel}</ButtonLabel>
                        </Button>
                        <Button
                            variant="primary"
                            size="md"
                            negative
                            type="submit"
                            disabled={!canConfirm || isSubmitting}
                            aria-busy={isSubmitting}
                        >
                            <ButtonLabel>{deleteLabel}</ButtonLabel>
                        </Button>
                    </ModalActions>
                </ModalFooter>
            </form>
        </Modal>
    </Overlay>
{/if}
