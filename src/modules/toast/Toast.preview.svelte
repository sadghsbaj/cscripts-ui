<script module>
    export const id = "toast";
    export const label = "Toast";
</script>

<script lang="ts">
    import { Sparkles } from "@lucide/svelte";
    import { Button, ButtonLabel } from "cs/svelte/button";
    import {
        TOAST_COLORS,
        TOAST_PLACEMENTS,
        toast,
        Toast,
        ToastAction,
        ToastClose,
        ToastDescription,
        Toaster,
        ToastIcon,
        ToastTitle,
        type ToastColor,
        type ToastPlacement,
        type ToastSnippetProps,
    } from "cs/svelte/toast";

    import { PreviewHeader, PreviewSection } from "../../../playground/components/index.ts";

    let placement = $state<ToastPlacement>("bottom-right");

    const colorLabels: Record<ToastColor, { button: string; title: string; description: string }> = {
        base: {
            button: "Base",
            title: "Draft saved",
            description: "Your changes were synced to the workspace.",
        },
        accent: {
            button: "Accent",
            title: "New comment",
            description: "Alex mentioned you in Design Review.",
        },
        positive: {
            button: "Positive",
            title: "Deployment complete",
            description: "Production build is now live.",
        },
        caution: {
            button: "Caution",
            title: "Storage almost full",
            description: "92% of your workspace quota is used.",
        },
        negative: {
            button: "Negative",
            title: "Upload failed",
            description: "The connection timed out. Please try again.",
        },
    };

    function triggerColor(color: ToastColor): void {
        const entry = colorLabels[color];
        toast[color](entry.title, { description: entry.description });
    }

    function triggerTitleAndDescription(): void {
        toast.base("Workspace updated", {
            description: "All 14 project tokens were synchronized with the latest design system release.",
        });
    }

    function triggerUndoAction(): void {
        toast.base("Message archived", {
            action: {
                label: "Undo",
                onClick: () => {
                    toast.positive("Restored to inbox");
                },
            },
        });
    }

    function triggerDescriptionWithAction(): void {
        toast.accent("Invite sent", {
            description: "taylor@example.com will receive an email link shortly.",
            action: {
                label: "Copy link",
                variant: "tertiary",
                onClick: () => {
                    toast.positive("Invite link copied");
                },
            },
        });
    }

    function triggerPromise(shouldResolve: boolean): void {
        const request = new Promise<{ count: number }>((resolve, reject) => {
            setTimeout(() => {
                if (shouldResolve) {
                    resolve({ count: 3 });
                } else {
                    reject(new Error("Network timeout"));
                }
            }, 1400);
        });

        void toast
            .promise(request, {
                loading: "Publishing changes…",
                success: (data) => `Published ${data.count} updates`,
                error: "Could not publish changes",
            })
            .catch(() => {});
    }

    function triggerPersistent(): void {
        toast.caution("Update required", {
            description: "Reload the tab when you are ready to apply the latest version.",
            duration: Infinity,
            action: {
                label: "Reload",
                onClick: () => {
                    toast.dismiss();
                },
            },
        });
    }

    function triggerNonDismissible(): void {
        toast.base("Syncing preferences…", {
            dismissible: false,
            duration: 2800,
        });
    }

    function triggerCustomCompound(): void {
        toast.custom(customCompoundToast, {
            color: "accent",
            duration: 6000,
        });
    }
</script>

{#snippet customCompoundToast({ color, dismissible, dismiss }: ToastSnippetProps)}
    <Toast {color} {dismissible} onDismiss={dismiss}>
        <ToastIcon icon={Sparkles} />
        <ToastTitle>Custom compound toast</ToastTitle>
        <ToastDescription>
            Built with Toast, ToastIcon, ToastTitle, ToastDescription, ToastAction, and ToastClose.
        </ToastDescription>
        <ToastAction variant="secondary" onclick={dismiss}>Got it</ToastAction>
        {#if dismissible}
            <ToastClose />
        {/if}
    </Toast>
{/snippet}

<Toaster {placement} />

<div class="flex flex-col gap-10">
    <PreviewHeader
        title="Toast"
        description="Transient, non-blocking top-layer notifications with semantic icon plates, adaptive actions, and stacked hover expansion."
    />

    <PreviewSection
        title="Placement & Stack"
        description="Switch the viewport anchor corner or edge, or clear all active toasts."
    >
        <div class="flex flex-col items-center gap-4 w-full">
            <div class="flex flex-wrap justify-center gap-2">
                {#each TOAST_PLACEMENTS as item (item)}
                    <Button
                        size="sm"
                        variant={placement === item ? "secondary" : "tertiary"}
                        aria-pressed={placement === item}
                        onclick={() => (placement = item)}
                    >
                        <ButtonLabel>{item}</ButtonLabel>
                    </Button>
                {/each}
            </div>

            <Button size="sm" variant="tertiary" onclick={() => toast.dismiss()}>
                <ButtonLabel>Dismiss all</ButtonLabel>
            </Button>
        </div>
    </PreviewSection>

    <PreviewSection
        title="Colors"
        description="All five semantic colors carried by the leading icon plate while keeping the floating surface calm."
    >
        {#each TOAST_COLORS as color (color)}
            <Button size="md" variant="secondary" onclick={() => triggerColor(color)}>
                <ButtonLabel>{colorLabels[color].button}</ButtonLabel>
            </Button>
        {/each}
    </PreviewSection>

    <PreviewSection
        title="Content & Actions"
        description="Adaptive grid layout for title + description, compact inline Undo, and description with action."
    >
        <Button size="md" variant="secondary" onclick={triggerTitleAndDescription}>
            <ButtonLabel>Title & Description</ButtonLabel>
        </Button>

        <Button size="md" variant="secondary" onclick={triggerUndoAction}>
            <ButtonLabel>Inline Undo</ButtonLabel>
        </Button>

        <Button size="md" variant="secondary" onclick={triggerDescriptionWithAction}>
            <ButtonLabel>Description + Action</ButtonLabel>
        </Button>
    </PreviewSection>

    <PreviewSection
        title="Lifecycle & Custom Compound"
        description="Async promise updates, persistent and non-dismissible states, and custom compound composition."
    >
        <Button size="md" variant="secondary" onclick={() => triggerPromise(true)}>
            <ButtonLabel>Promise (Success)</ButtonLabel>
        </Button>

        <Button size="md" variant="secondary" onclick={() => triggerPromise(false)}>
            <ButtonLabel>Promise (Error)</ButtonLabel>
        </Button>

        <Button size="md" variant="secondary" onclick={triggerPersistent}>
            <ButtonLabel>Persistent (Infinity)</ButtonLabel>
        </Button>

        <Button size="md" variant="secondary" onclick={triggerNonDismissible}>
            <ButtonLabel>Non-dismissible</ButtonLabel>
        </Button>

        <Button size="md" variant="secondary" onclick={triggerCustomCompound}>
            <ButtonLabel>Custom Compound</ButtonLabel>
        </Button>
    </PreviewSection>
</div>
