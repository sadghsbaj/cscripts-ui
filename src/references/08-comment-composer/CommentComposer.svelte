<script lang="ts">
    import { Paperclip, Smile } from "@lucide/svelte";
    import { autoResize } from "cs/svelte/auto-resize";
    import { Button, ButtonIcon, ButtonLabel } from "cs/svelte/button";
    import { Card, CardBody, CardFooter } from "cs/svelte/card";
    import { HitArea } from "cs/svelte/hit-area";
    import { Kbd, KbdGroup, KbdSeparator } from "cs/svelte/kbd";
    import { TextArea } from "cs/svelte/text-area";
    import { TextMorph } from "cs/svelte/text-morph";
    import { tooltip } from "cs/svelte/tooltip";

    export interface CommentComposerProps {
        value?: string;
        initials?: string;
        placeholder?: string;
        submitting?: boolean;
        disabled?: boolean;
        onsubmit?: (value: string) => void | Promise<void>;
        class?: string;
    }

    let {
        value = $bindable(""),
        initials = "CK",
        placeholder = "Write a comment...",
        submitting = false,
        disabled = false,
        onsubmit,
        class: className,
    }: CommentComposerProps = $props();

    let isInternalSubmitting = $state(false);

    const isSubmitting = $derived(submitting || isInternalSubmitting);
    const isLocked = $derived(disabled || isSubmitting);
    const canSubmit = $derived(value.trim().length > 0 && !isLocked);
    const hasText = $derived(value.trim().length > 0);

    async function handleSubmit(): Promise<void> {
        const trimmed = value.trim();
        if (!trimmed || isLocked) return;

        if (!onsubmit) {
            value = "";
            return;
        }

        isInternalSubmitting = true;
        try {
            await onsubmit(trimmed);
            value = "";
        } finally {
            isInternalSubmitting = false;
        }
    }

    function handleKeydown(event: KeyboardEvent): void {
        if (!(event.ctrlKey || event.metaKey) || event.key !== "Enter") return;

        event.preventDefault();
        void handleSubmit();
    }
</script>

<div class={["w-full max-w-[var(--cs-container-lg)] flex items-start gap-3", className]}>
    <div
        class="size-8 mt-1 rounded-full shrink-0 select-none flex-center bg-base-soft text-strong text-xs font-600"
        aria-hidden="true"
    >
        {initials}
    </div>

    <Card
        variant="elevated"
        size="md"
        class={["cs-composer-card flex-1 min-w-0", hasText && "has-text"]}
        data-disabled={disabled ? "" : undefined}
    >
        <CardBody>
            <TextArea
                variant="soft"
                size="md"
                rows={2}
                resize="none"
                {placeholder}
                aria-label="Comment"
                bind:value
                disabled={isLocked}
                class="cs-composer-textarea"
                onkeydown={handleKeydown}
                {@attach autoResize({ minRows: 2, maxRows: 7 })}
            />
        </CardBody>

        <CardFooter class="w-full flex items-center justify-between gap-3 pt-0">
            <div class="flex items-center gap-1">
                <Button
                    variant="ghost"
                    size="sm"
                    iconOnly
                    disabled={isLocked}
                    aria-label="Attach file"
                    {@attach tooltip({ text: "Attach file", placement: "top" })}
                >
                    <ButtonIcon icon={Paperclip} />
                    <HitArea size="md" />
                </Button>

                <Button
                    variant="ghost"
                    size="sm"
                    iconOnly
                    disabled={isLocked}
                    aria-label="Add emoji"
                    {@attach tooltip({ text: "Add emoji", placement: "top" })}
                >
                    <ButtonIcon icon={Smile} />
                    <HitArea size="md" />
                </Button>
            </div>

            <div class="flex items-center gap-2.5">
                <div class="cs-composer-hint" aria-hidden="true">
                    <KbdGroup variant="soft" size="sm">
                        <Kbd symbol="ctrl" />
                        <KbdSeparator />
                        <Kbd symbol="enter" display="text" />
                    </KbdGroup>
                </div>

                <Button
                    variant="primary"
                    size="sm"
                    disabled={!canSubmit}
                    aria-busy={isSubmitting || undefined}
                    onclick={handleSubmit}
                >
                    <ButtonLabel><TextMorph text={isSubmitting ? "Sending..." : "Send"} /></ButtonLabel>
                </Button>
            </div>
        </CardFooter>
    </Card>
</div>

<style>
    /* Child component roots require :global() so the surface overrides and :has() focus ring apply across component boundaries. */
    :global(.cs-composer-textarea) {
        --cs-text-area-bg: transparent;
        --cs-text-area-bg-hover: transparent;
        --cs-text-area-shadow: none;
        --cs-text-area-shadow-hover: none;
        --cs-text-area-ring-shadow: none;
        --cs-text-area-ring-shadow-hover: none;
        padding: 0;
        border-radius: 0;
    }

    :global(.cs-composer-card) {
        transition: box-shadow var(--cs-dur-120) var(--cs-ease-quart-out);
    }

    :global(.cs-composer-card:has(.cs-text-area:focus:not(:disabled))) {
        box-shadow: inset 0 0 0 2px var(--cs-color-accent-solid), var(--cs-shadow-elevated);
    }

    :global(.cs-composer-card[data-disabled]) {
        --cs-card-bg: var(--cs-color-disabled-bg-elevated);
        box-shadow: 0 0 0 1px var(--cs-color-disabled-border);
    }

    .cs-composer-hint {
        opacity: 0;
        transform: translateX(4px);
        transition:
            opacity var(--cs-dur-exit-sm) var(--cs-ease-exit),
            transform var(--cs-dur-exit-sm) var(--cs-ease-exit);
    }

    :global(.cs-composer-card:has(.cs-text-area:focus:not(:disabled))) .cs-composer-hint,
    :global(.cs-composer-card.has-text:not([data-disabled])) .cs-composer-hint {
        opacity: 1;
        transform: translateX(0);
        transition:
            opacity var(--cs-dur-enter-sm) var(--cs-ease-enter),
            transform var(--cs-dur-enter-sm) var(--cs-ease-enter);
    }
</style>
