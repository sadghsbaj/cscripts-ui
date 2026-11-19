<script lang="ts">
    import { Button, ButtonLabel } from "cs/svelte/button";
    import {
        Modal,
        ModalActions,
        ModalClose,
        ModalDescription,
        ModalFooter,
        ModalHeader,
        ModalTitle,
    } from "cs/svelte/modal";
    import { Overlay } from "cs/svelte/overlay";

    export interface DiscardDialogProps {
        open?: boolean;
        title?: string;
        description?: string;
        keepLabel?: string;
        discardLabel?: string;
        onconfirm?: () => void | Promise<void>;
        oncancel?: () => void;
    }

    let {
        open = $bindable(false),
        title = "Discard changes?",
        description = "Unsaved edits are lost.",
        keepLabel = "Keep",
        discardLabel = "Discard",
        onconfirm,
        oncancel,
    }: DiscardDialogProps = $props();

    let modal = $state<Modal | undefined>();
    let isSubmitting = $state(false);
    let confirmed = false;

    function handleModalClose(): void {
        if (!confirmed) {
            oncancel?.();
        }
    }

    function handleCancel(): void {
        if (isSubmitting) return;
        void modal?.requestClose("programmatic");
    }

    async function handleConfirm(): Promise<void> {
        if (isSubmitting) return;
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
        <Modal bind:this={modal} bind:open size="sm" dismissible={!isSubmitting} onClose={handleModalClose}>
            <ModalHeader>
                <ModalTitle>{title}</ModalTitle>
                <ModalDescription>{description}</ModalDescription>
            </ModalHeader>
            <ModalClose disabled={isSubmitting} />
            <ModalFooter>
                <ModalActions>
                    <Button variant="tertiary" size="md" disabled={isSubmitting} onclick={handleCancel}>
                        <ButtonLabel>{keepLabel}</ButtonLabel>
                    </Button>
                    <Button
                        variant="primary"
                        size="md"
                        disabled={isSubmitting}
                        aria-busy={isSubmitting}
                        onclick={handleConfirm}
                    >
                        <ButtonLabel>{discardLabel}</ButtonLabel>
                    </Button>
                </ModalActions>
            </ModalFooter>
        </Modal>
    </Overlay>
{/if}
