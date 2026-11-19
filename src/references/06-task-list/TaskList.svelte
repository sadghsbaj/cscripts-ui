<script lang="ts">
    import { Card, CardBody } from "cs/svelte/card";
    import { Checkbox } from "cs/svelte/checkbox";
    import { NumberMorph } from "cs/svelte/number-morph";
    import { TextMorph } from "cs/svelte/text-morph";

    export interface TaskEntry {
        id: string;
        title: string;
        done: boolean;
    }

    export interface TaskListProps {
        tasks?: TaskEntry[];
        heading?: string;
        disabled?: boolean;
        class?: string;
    }

    let {
        tasks = $bindable<TaskEntry[]>([]),
        heading = "Today",
        disabled = false,
        class: className,
    }: TaskListProps = $props();

    const doneCount = $derived(tasks.filter((task) => task.done).length);
</script>

<div class={["w-full max-w-[var(--cs-container-md)]", className]}>
    <div class="flex items-baseline justify-between gap-4 px-1 mb-2">
        <h2 class="title-sm text-weak">{heading}</h2>
        <span class="text-xs font-500 text-weak tabular-nums">
            <NumberMorph value={doneCount} willChange /> of {tasks.length} done
        </span>
    </div>

    <Card variant="elevated" size="lg">
        <CardBody>
            <div class="divide-y divide-base-soft">
                {#each tasks as task (task.id)}
                    <div class="py-3.5 first:pt-0 last:pb-0">
                        <label class="min-h-6 flex items-center justify-between gap-4 select-none">
                            <span class="flex items-center gap-3 min-w-0">
                                <Checkbox
                                    variant="soft"
                                    size="sm"
                                    class="shrink-0"
                                    bind:checked={task.done}
                                    {disabled}
                                />
                                <span
                                    class={[
                                        "text-sm font-500 text-trim transition-colors duration-[var(--cs-dur-effect-fast)] ease-[var(--cs-ease-effect)]",
                                        disabled
                                            ? "text-[var(--cs-color-disabled-fg)]"
                                            : task.done
                                              ? "text-weak"
                                              : "text-strong",
                                    ]}
                                >
                                    {task.title}
                                </span>
                            </span>

                            <span
                                class={[
                                    "shrink-0 text-xs font-500 transition-colors duration-[var(--cs-dur-effect-fast)] ease-[var(--cs-ease-effect)]",
                                    disabled
                                        ? "text-[var(--cs-color-disabled-fg)]"
                                        : task.done
                                          ? "text-weak"
                                          : "text-main",
                                ]}
                            >
                                <TextMorph text={task.done ? "Done" : "Open"} />
                            </span>
                        </label>
                    </div>
                {/each}
            </div>
        </CardBody>
    </Card>
</div>
