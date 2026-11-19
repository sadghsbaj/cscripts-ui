<script lang="ts">
    import { Button, ButtonLabel } from "cs/svelte/button";
    import { Card, CardBody } from "cs/svelte/card";
    import { HitArea } from "cs/svelte/hit-area";
    import { Progress } from "cs/svelte/progress";
    import { TextMorph } from "cs/svelte/text-morph";

    export type UploadStatus = "uploading" | "done" | "error";

    export interface UploadEntry {
        id: string;
        name: string;
        sizeLabel: string;
        progress: number;
        status: UploadStatus;
    }

    export interface UploadItemProps {
        items: UploadEntry[];
        oncancel?: (id: string) => void;
        onretry?: (id: string) => void;
        class?: string;
    }

    let { items, oncancel, onretry, class: className }: UploadItemProps = $props();
</script>

<div class={["w-full max-w-[var(--cs-container-md)]", className]}>
    <h2 class="title-sm text-weak px-1 mb-2">Uploads</h2>

    <Card variant="elevated" size="lg">
        <CardBody>
            <div class="divide-y divide-base-soft">
                {#each items as item (item.id)}
                    {const isOpen = $derived(item.status !== "done")}
                    {const metaText = $derived(
                        item.status === "error"
                            ? "Upload failed"
                            : item.status === "done"
                              ? `${item.sizeLabel}, Complete`
                              : `${item.sizeLabel}, ${Math.round(item.progress)}%`,
                    )}

                    <div class="py-3.5 first:pt-0 last:pb-0 flex flex-col">
                        <div class="min-h-6 flex items-center justify-between gap-4">
                            <span class="text-sm font-500 text-strong min-w-0 truncate">{item.name}</span>

                            <div class="shrink-0">
                                {#if item.status === "uploading"}
                                    <Button variant="ghost" size="xs" onclick={() => oncancel?.(item.id)}>
                                        <ButtonLabel>Cancel</ButtonLabel>
                                        <HitArea size="md" />
                                    </Button>
                                {:else if item.status === "error"}
                                    <Button variant="tertiary" size="xs" onclick={() => onretry?.(item.id)}>
                                        <ButtonLabel>Retry</ButtonLabel>
                                        <HitArea size="md" />
                                    </Button>
                                {:else}
                                    <span class="text-xs font-500 text-weak">Done</span>
                                {/if}
                            </div>
                        </div>

                        <div class="mt-0.5">
                            <span
                                class={[
                                    "description-sm",
                                    item.status === "error"
                                        ? "text-[var(--cs-color-negative-soft-fg)]"
                                        : "text-weak",
                                ]}
                            >
                                <TextMorph text={metaText} tabular />
                            </span>
                        </div>

                        <div class={["cs-upload-progress", isOpen && "is-open"]} inert={!isOpen}>
                            <div class="cs-upload-progress-inner">
                                <div class="pt-2.5">
                                    <Progress
                                        appearance="bar"
                                        variant="soft"
                                        size="sm"
                                        color={item.status === "error" ? "negative" : "accent"}
                                        value={item.progress}
                                        aria-label={`${item.name} upload progress`}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                {/each}
            </div>
        </CardBody>
    </Card>
</div>

<style>
    .cs-upload-progress {
        display: grid;
        grid-template-rows: 0fr;
        opacity: 0;
        transition:
            grid-template-rows var(--cs-dur-exit-sm) var(--cs-ease-exit),
            opacity var(--cs-dur-exit-sm) var(--cs-ease-exit);
    }

    .cs-upload-progress.is-open {
        grid-template-rows: 1fr;
        opacity: 1;
        transition:
            grid-template-rows var(--cs-dur-enter-sm) var(--cs-ease-enter),
            opacity var(--cs-dur-enter-sm) var(--cs-ease-enter);
    }

    /* Keep horizontal overflow visible so progress caps and focus rings are never clipped. */
    .cs-upload-progress-inner {
        overflow-x: visible;
        overflow-y: clip;
        min-height: 0;
    }
</style>
