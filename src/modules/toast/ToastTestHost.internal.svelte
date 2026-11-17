<script lang="ts">
    import type { Snippet } from "svelte";

    import {
        Toast,
        ToastAction,
        ToastClose,
        ToastDescription,
        Toaster,
        ToastIcon,
        ToastTitle,
        toast,
        type ToastColor,
        type ToastPlacement,
        type ToastSnippetProps,
    } from "./index.ts";

    interface Props {
        placement?: ToastPlacement;
        duration?: number;
        maxVisible?: number;
        standaloneColor?: ToastColor;
        standaloneDismissible?: boolean;
        onStandaloneDismiss?: () => void;
        onCustomAction?: () => void;
        onCloseClick?: () => void;
        renderStandalone?: boolean;
    }

    let {
        placement = "bottom-right",
        duration = 4000,
        maxVisible = 3,
        standaloneColor = "accent",
        standaloneDismissible = true,
        onStandaloneDismiss,
        onCustomAction,
        onCloseClick,
        renderStandalone = false,
    }: Props = $props();

    let toasterRef = $state<HTMLElement | null>(null);
    let toastRef = $state<HTMLDivElement | null>(null);
    let iconRef = $state<HTMLSpanElement | null>(null);
    let titleRef = $state<HTMLDivElement | null>(null);
    let descriptionRef = $state<HTMLDivElement | null>(null);
    let actionRef = $state<HTMLButtonElement | null>(null);
    let closeRef = $state<HTMLButtonElement | null>(null);

    export function getRefs(): {
        toasterRef: HTMLElement | null;
        toastRef: HTMLDivElement | null;
        iconRef: HTMLSpanElement | null;
        titleRef: HTMLDivElement | null;
        descriptionRef: HTMLDivElement | null;
        actionRef: HTMLButtonElement | null;
        closeRef: HTMLButtonElement | null;
    } {
        return {
            toasterRef,
            toastRef,
            iconRef,
            titleRef,
            descriptionRef,
            actionRef,
            closeRef,
        };
    }

    export function triggerCustomToast(color: ToastColor = "positive", dismissible = true): string {
        return toast.custom(customToastSnippet as Snippet<[ToastSnippetProps]>, {
            color,
            dismissible,
        });
    }
</script>

{#snippet customToastSnippet(props: ToastSnippetProps)}
    <Toast
        color={props.color}
        dismissible={props.dismissible}
        onDismiss={props.dismiss}
        data-testid="custom-toast"
        data-toast-id={props.id}
    >
        <ToastIcon data-testid="custom-icon" />
        <ToastTitle data-testid="custom-title">Custom Compound</ToastTitle>
        <ToastDescription data-testid="custom-description">Snippet body</ToastDescription>
        <ToastAction data-testid="custom-action" onclick={() => onCustomAction?.()}>Inspect</ToastAction>
        {#if props.dismissible}
            <ToastClose data-testid="custom-close" onclick={() => onCloseClick?.()} />
        {/if}
    </Toast>
{/snippet}

<Toaster bind:ref={toasterRef} {placement} {duration} {maxVisible} data-testid="toaster" />

{#if renderStandalone}
    <Toast
        bind:ref={toastRef}
        color={standaloneColor}
        dismissible={standaloneDismissible}
        onDismiss={onStandaloneDismiss}
        data-testid="standalone-toast"
    >
        <ToastIcon bind:ref={iconRef} data-testid="standalone-icon" />
        <ToastTitle bind:ref={titleRef} data-testid="standalone-title">Standalone Title</ToastTitle>
        <ToastDescription bind:ref={descriptionRef} data-testid="standalone-description">
            Standalone Description
        </ToastDescription>
        <ToastAction bind:ref={actionRef} data-testid="standalone-action" onclick={() => onCustomAction?.()}>
            Retry
        </ToastAction>
        <ToastClose bind:ref={closeRef} data-testid="standalone-close" onclick={() => onCloseClick?.()} />
    </Toast>
{/if}
