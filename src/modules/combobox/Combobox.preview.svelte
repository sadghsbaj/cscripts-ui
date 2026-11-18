<script module>
    export const id = "combobox";
    export const label = "Combobox";
</script>

<script lang="ts">
    import {
        Compass,
        FileText,
        Folder,
        Globe,
        Layers,
        Lock,
        Search,
        Settings,
        Shield,
        Sparkles,
        Users,
        X,
        Zap,
    } from "@lucide/svelte";
    import { Badge, BadgeLabel } from "cs/svelte/badge";
    import {
        COMBOBOX_SIZES,
        Combobox,
        ComboboxClear,
        ComboboxContent,
        ComboboxControl,
        ComboboxEmpty,
        ComboboxGroup,
        ComboboxGroupLabel,
        ComboboxIcon,
        ComboboxInput,
        ComboboxItem,
        ComboboxItemDescription,
        ComboboxItemIcon,
        ComboboxItemText,
        ComboboxSeparator,
        ComboboxTrigger,
        type ComboboxSize,
    } from "cs/svelte/combobox";
    import { Kbd } from "cs/svelte/kbd";
    import { TextInput, TextInputAction, TextInputField } from "cs/svelte/text-input";

    import { PreviewHeader, PreviewSection, SunkenWell } from "../../../playground/components/index.ts";

    let basicValue = $state<string | undefined>("svelte");
    let softValue = $state<string | undefined>("designer");
    let softInputValue = $state("Designer");
    let elevatedValue = $state<string | undefined>();
    let elevatedInputValue = $state("");

    let sizeValues = $state<Record<ComboboxSize, string | undefined>>({
        xs: "pro",
        sm: "pro",
        md: "pro",
        lg: "pro",
        xl: "pro",
    });

    let iconValue = $state<string | undefined>("public");
    let descriptionValue = $state<string | undefined>("fast");
    let trailingValue = $state<string | undefined>("workspace");
    let groupValue = $state<string | undefined>("in-progress");

    let invalidSoftValue = $state<string | undefined>();
    let invalidElevatedValue = $state<string | undefined>();
    let openOnFocusValue = $state<string | undefined>();
    let customValue = $state<string | undefined>("design-systems");
    let customInputValue = $state("design-systems");

    const frameworks = [
        { value: "svelte", label: "SvelteKit" },
        { value: "astro", label: "Astro" },
        { value: "next", label: "Next.js" },
        { value: "nuxt", label: "Nuxt" },
        { value: "remix", label: "Remix" },
        { value: "solid", label: "SolidStart" },
    ] as const;

    const closeScript = ["</", "script>"].join("");

    /* eslint-disable unicorn/no-incorrect-template-string-interpolation -- Svelte code snippets contain literal {Component} bindings */
    const basicCode = `<script lang="ts">
    import { Search } from "@lucide/svelte";
    import {
        Combobox,
        ComboboxClear,
        ComboboxContent,
        ComboboxControl,
        ComboboxEmpty,
        ComboboxIcon,
        ComboboxInput,
        ComboboxItem,
        ComboboxTrigger,
    } from "cs/svelte/combobox";

    let value = $state<string | undefined>("svelte");
${closeScript}

<Combobox variant="soft" size="md" bind:value>
    <ComboboxControl class="w-60">
        <ComboboxIcon icon={Search} />
        <ComboboxInput placeholder="Search framework…" />
        <ComboboxClear />
        <ComboboxTrigger />
    </ComboboxControl>
    <ComboboxContent>
        <ComboboxEmpty>No matching framework.</ComboboxEmpty>
        <ComboboxItem value="svelte" label="SvelteKit">SvelteKit</ComboboxItem>
        <ComboboxItem value="astro" label="Astro">Astro</ComboboxItem>
        <ComboboxItem value="next" label="Next.js">Next.js</ComboboxItem>
    </ComboboxContent>
</Combobox>`;

    const variantsCode = `<Combobox variant="soft" size="md" bind:value>
    <ComboboxControl class="w-48">
        <ComboboxInput placeholder="Select role…" />
        <ComboboxClear />
        <ComboboxTrigger />
    </ComboboxControl>
    <ComboboxContent>...</ComboboxContent>
</Combobox>

<Combobox variant="elevated" size="md" bind:value>
    <ComboboxControl class="w-48">
        <ComboboxInput placeholder="Select role…" />
        <ComboboxClear />
        <ComboboxTrigger />
    </ComboboxControl>
    <ComboboxContent>...</ComboboxContent>
</Combobox>`;

    const sizesCode = `<Combobox variant="soft" size="xs" bind:value>...</Combobox>
<Combobox variant="soft" size="sm" bind:value>...</Combobox>
<Combobox variant="soft" size="md" bind:value>...</Combobox>
<Combobox variant="soft" size="lg" bind:value>...</Combobox>
<Combobox variant="soft" size="xl" bind:value>...</Combobox>`;

    const richItemsCode = `<ComboboxItem value="fast">
    <ComboboxItemIcon icon={Zap} />
    <ComboboxItemText>Fast</ComboboxItemText>
    <ComboboxItemDescription>Quick replies for daily work</ComboboxItemDescription>
</ComboboxItem>

<ComboboxItem value="workspace">
    <ComboboxItemIcon icon={Layers} />
    <ComboboxItemText>Workspace</ComboboxItemText>
    <Badge variant="soft" color="accent" size="xs">
        <BadgeLabel>Pro</BadgeLabel>
    </Badge>
</ComboboxItem>

<ComboboxGroup>
    <ComboboxGroupLabel>Active</ComboboxGroupLabel>
    <ComboboxItem value="in-progress">In Progress</ComboboxItem>
</ComboboxGroup>
<ComboboxSeparator />
<ComboboxItem value="archived" disabled>Archived</ComboboxItem>`;

    const statesCode = `<Combobox variant="soft" size="md" invalid bind:value>...</Combobox>
<Combobox variant="elevated" size="md" disabled value="production">...</Combobox>
<Combobox variant="soft" size="md" openOnFocus bind:value>...</Combobox>
<Combobox variant="soft" size="md" allowCustomValue bind:value bind:inputValue>...</Combobox>`;
    /* eslint-enable unicorn/no-incorrect-template-string-interpolation */
</script>

<div class="flex flex-col gap-10">
    <PreviewHeader
        title="Combobox"
        description="Searchable input and floating listbox with filtering, clear action, and rich items."
    />

    <PreviewSection
        title="Basic"
        description="Filterable input with leading icon, clear button, dropdown trigger, and empty state."
        code={basicCode}
    >
        <Combobox variant="soft" size="md" bind:value={basicValue}>
            <ComboboxControl class="w-60">
                <ComboboxIcon icon={Search} />
                <ComboboxInput placeholder="Search framework…" />
                <ComboboxClear />
                <ComboboxTrigger />
            </ComboboxControl>
            <ComboboxContent>
                <ComboboxEmpty>No matching framework.</ComboboxEmpty>
                {#each frameworks as item (item.value)}
                    <ComboboxItem value={item.value} label={item.label}>{item.label}</ComboboxItem>
                {/each}
            </ComboboxContent>
        </Combobox>
    </PreviewSection>

    <PreviewSection
        title="Variants"
        description="Compare soft and elevated surfaces alongside TextInput for height and squircle parity."
        code={variantsCode}
    >
        <div class="flex flex-wrap items-center gap-6">
            <div class="flex flex-col gap-1.5">
                <span class="text-xs font-medium text-weak">soft</span>
                <div class="flex items-center gap-3">
                    <Combobox variant="soft" size="md" bind:value={softValue}>
                        <ComboboxControl class="w-48">
                            <ComboboxInput placeholder="Select role…" />
                            <ComboboxClear />
                            <ComboboxTrigger />
                        </ComboboxControl>
                        <ComboboxContent>
                            <ComboboxEmpty />
                            <ComboboxItem value="designer">Designer</ComboboxItem>
                            <ComboboxItem value="engineer">Engineer</ComboboxItem>
                            <ComboboxItem value="product">Product</ComboboxItem>
                            <ComboboxItem value="research">Research</ComboboxItem>
                        </ComboboxContent>
                    </Combobox>

                    <TextInput variant="soft" size="md" class="w-48">
                        <TextInputField bind:value={softInputValue} placeholder="Full name" />
                        <TextInputAction
                            icon={X}
                            aria-label="Clear name"
                            visible={softInputValue.length > 0}
                            onclick={() => (softInputValue = "")}
                        />
                    </TextInput>
                </div>
            </div>

            <SunkenWell>
                <div class="flex flex-col gap-1.5">
                    <span class="text-xs font-medium text-weak">elevated</span>
                    <div class="flex items-center gap-3">
                        <Combobox variant="elevated" size="md" bind:value={elevatedValue}>
                            <ComboboxControl class="w-48">
                                <ComboboxInput placeholder="Select role…" />
                                <ComboboxClear />
                                <ComboboxTrigger />
                            </ComboboxControl>
                            <ComboboxContent>
                                <ComboboxEmpty />
                                <ComboboxItem value="designer">Designer</ComboboxItem>
                                <ComboboxItem value="engineer">Engineer</ComboboxItem>
                                <ComboboxItem value="product">Product</ComboboxItem>
                                <ComboboxItem value="research">Research</ComboboxItem>
                            </ComboboxContent>
                        </Combobox>

                        <TextInput variant="elevated" size="md" class="w-48">
                            <TextInputField bind:value={elevatedInputValue} placeholder="Full name" />
                            <TextInputAction
                                icon={X}
                                aria-label="Clear name"
                                visible={elevatedInputValue.length > 0}
                                onclick={() => (elevatedInputValue = "")}
                            />
                        </TextInput>
                    </div>
                </div>
            </SunkenWell>
        </div>
    </PreviewSection>

    <PreviewSection
        title="Sizes"
        description="Five T-shirt sizes from xs through xl matching TextInput and Select heights."
        code={sizesCode}
    >
        <div class="flex flex-col items-start gap-3">
            {#each COMBOBOX_SIZES as size (size)}
                <div class="flex items-center gap-3">
                    <span class="w-6 text-xs font-medium text-weak uppercase">{size}</span>
                    <Combobox variant="soft" {size} bind:value={sizeValues[size]}>
                        <ComboboxControl class="w-56">
                            <ComboboxInput placeholder="Select plan…" />
                            <ComboboxClear />
                            <ComboboxTrigger />
                        </ComboboxControl>
                        <ComboboxContent>
                            <ComboboxEmpty />
                            <ComboboxItem value="starter">Starter</ComboboxItem>
                            <ComboboxItem value="pro">Pro</ComboboxItem>
                            <ComboboxItem value="team">Team</ComboboxItem>
                            <ComboboxItem value="enterprise">Enterprise</ComboboxItem>
                        </ComboboxContent>
                    </Combobox>
                </div>
            {/each}
        </div>
    </PreviewSection>

    <PreviewSection
        title="Rich Items"
        description="Icons, descriptions, trailing badges or shortcuts, groups, separators, and disabled items."
        code={richItemsCode}
    >
        <div class="flex flex-wrap items-start gap-5">
            <div class="flex flex-col gap-1.5">
                <span class="text-xs font-medium text-weak">Icons</span>
                <Combobox variant="soft" size="md" bind:value={iconValue}>
                    <ComboboxControl class="w-48">
                        <ComboboxInput placeholder="Visibility…" />
                        <ComboboxClear />
                        <ComboboxTrigger />
                    </ComboboxControl>
                    <ComboboxContent>
                        <ComboboxEmpty />
                        <ComboboxItem value="public">
                            <ComboboxItemIcon icon={Globe} />
                            <ComboboxItemText>Public</ComboboxItemText>
                        </ComboboxItem>
                        <ComboboxItem value="team">
                            <ComboboxItemIcon icon={Users} />
                            <ComboboxItemText>Team</ComboboxItemText>
                        </ComboboxItem>
                        <ComboboxItem value="private">
                            <ComboboxItemIcon icon={Lock} />
                            <ComboboxItemText>Private</ComboboxItemText>
                        </ComboboxItem>
                    </ComboboxContent>
                </Combobox>
            </div>

            <div class="flex flex-col gap-1.5">
                <span class="text-xs font-medium text-weak">Descriptions</span>
                <Combobox variant="soft" size="md" bind:value={descriptionValue}>
                    <ComboboxControl class="w-56">
                        <ComboboxInput placeholder="Select mode…" />
                        <ComboboxClear />
                        <ComboboxTrigger />
                    </ComboboxControl>
                    <ComboboxContent>
                        <ComboboxEmpty />
                        <ComboboxItem value="fast">
                            <ComboboxItemIcon icon={Zap} />
                            <ComboboxItemText>Fast</ComboboxItemText>
                            <ComboboxItemDescription>Quick replies for daily work</ComboboxItemDescription>
                        </ComboboxItem>
                        <ComboboxItem value="balanced">
                            <ComboboxItemIcon icon={Sparkles} />
                            <ComboboxItemText>Balanced</ComboboxItemText>
                            <ComboboxItemDescription>Everyday reasoning and writing</ComboboxItemDescription>
                        </ComboboxItem>
                        <ComboboxItem value="deep">
                            <ComboboxItemIcon icon={Compass} />
                            <ComboboxItemText>Deep</ComboboxItemText>
                            <ComboboxItemDescription>Thorough research and analysis</ComboboxItemDescription>
                        </ComboboxItem>
                    </ComboboxContent>
                </Combobox>
            </div>

            <div class="flex flex-col gap-1.5">
                <span class="text-xs font-medium text-weak">Trailing</span>
                <Combobox variant="soft" size="md" bind:value={trailingValue}>
                    <ComboboxControl class="w-56">
                        <ComboboxInput placeholder="Go to…" />
                        <ComboboxClear />
                        <ComboboxTrigger />
                    </ComboboxControl>
                    <ComboboxContent>
                        <ComboboxEmpty />
                        <ComboboxItem value="workspace">
                            <ComboboxItemIcon icon={Layers} />
                            <ComboboxItemText>Workspace</ComboboxItemText>
                            <Badge variant="soft" color="accent" size="xs">
                                <BadgeLabel>Pro</BadgeLabel>
                            </Badge>
                        </ComboboxItem>
                        <ComboboxItem value="security">
                            <ComboboxItemIcon icon={Shield} />
                            <ComboboxItemText>Security</ComboboxItemText>
                            <Badge variant="soft" color="positive" size="xs">
                                <BadgeLabel>New</BadgeLabel>
                            </Badge>
                        </ComboboxItem>
                        <ComboboxItem value="projects">
                            <ComboboxItemIcon icon={Folder} />
                            <ComboboxItemText>Projects</ComboboxItemText>
                            <Kbd variant="soft" size="xs">1</Kbd>
                        </ComboboxItem>
                        <ComboboxItem value="documents">
                            <ComboboxItemIcon icon={FileText} />
                            <ComboboxItemText>Documents</ComboboxItemText>
                            <Kbd variant="soft" size="xs">2</Kbd>
                        </ComboboxItem>
                        <ComboboxItem value="settings">
                            <ComboboxItemIcon icon={Settings} />
                            <ComboboxItemText>Settings</ComboboxItemText>
                        </ComboboxItem>
                    </ComboboxContent>
                </Combobox>
            </div>

            <div class="flex flex-col gap-1.5">
                <span class="text-xs font-medium text-weak">Groups</span>
                <Combobox variant="soft" size="md" bind:value={groupValue}>
                    <ComboboxControl class="w-56">
                        <ComboboxInput placeholder="Select status…" />
                        <ComboboxClear />
                        <ComboboxTrigger />
                    </ComboboxControl>
                    <ComboboxContent>
                        <ComboboxEmpty />
                        <ComboboxGroup>
                            <ComboboxGroupLabel>Active</ComboboxGroupLabel>
                            <ComboboxItem value="backlog">Backlog</ComboboxItem>
                            <ComboboxItem value="in-progress">In Progress</ComboboxItem>
                            <ComboboxItem value="in-review">In Review</ComboboxItem>
                        </ComboboxGroup>
                        <ComboboxGroup>
                            <ComboboxGroupLabel>Closed</ComboboxGroupLabel>
                            <ComboboxItem value="done">Done</ComboboxItem>
                            <ComboboxItem value="archived" disabled>Archived</ComboboxItem>
                        </ComboboxGroup>
                        <ComboboxSeparator />
                        <ComboboxItem value="unassigned">Unassigned</ComboboxItem>
                    </ComboboxContent>
                </Combobox>
            </div>
        </div>
    </PreviewSection>

    <PreviewSection
        title="States"
        description="Invalid and disabled states across both variants, plus openOnFocus and allowCustomValue."
        code={statesCode}
    >
        <div class="flex flex-col gap-5">
            <div class="flex flex-wrap items-center gap-6">
                <div class="flex flex-col gap-1.5">
                    <span class="text-xs font-medium text-weak">Invalid soft</span>
                    <Combobox variant="soft" size="md" invalid bind:value={invalidSoftValue}>
                        <ComboboxControl class="w-52">
                            <ComboboxInput placeholder="Select region…" />
                            <ComboboxClear />
                            <ComboboxTrigger />
                        </ComboboxControl>
                        <ComboboxContent>
                            <ComboboxEmpty />
                            <ComboboxItem value="us-east">US East</ComboboxItem>
                            <ComboboxItem value="eu-west">EU West</ComboboxItem>
                            <ComboboxItem value="ap-south">AP South</ComboboxItem>
                        </ComboboxContent>
                    </Combobox>
                </div>

                <SunkenWell>
                    <div class="flex flex-col gap-1.5">
                        <span class="text-xs font-medium text-weak">Invalid elevated</span>
                        <Combobox variant="elevated" size="md" invalid bind:value={invalidElevatedValue}>
                            <ComboboxControl class="w-52">
                                <ComboboxInput placeholder="Select region…" />
                                <ComboboxClear />
                                <ComboboxTrigger />
                            </ComboboxControl>
                            <ComboboxContent>
                                <ComboboxEmpty />
                                <ComboboxItem value="us-east">US East</ComboboxItem>
                                <ComboboxItem value="eu-west">EU West</ComboboxItem>
                                <ComboboxItem value="ap-south">AP South</ComboboxItem>
                            </ComboboxContent>
                        </Combobox>
                    </div>
                </SunkenWell>
            </div>

            <div class="flex flex-wrap items-center gap-6">
                <div class="flex flex-col gap-1.5">
                    <span class="text-xs font-medium text-weak">Disabled soft</span>
                    <Combobox variant="soft" size="md" disabled value="production" inputValue="Production">
                        <ComboboxControl class="w-52">
                            <ComboboxInput placeholder="Environment…" />
                            <ComboboxClear />
                            <ComboboxTrigger />
                        </ComboboxControl>
                        <ComboboxContent>
                            <ComboboxItem value="production">Production</ComboboxItem>
                            <ComboboxItem value="staging">Staging</ComboboxItem>
                        </ComboboxContent>
                    </Combobox>
                </div>

                <SunkenWell>
                    <div class="flex flex-col gap-1.5">
                        <span class="text-xs font-medium text-weak">Disabled elevated</span>
                        <Combobox variant="elevated" size="md" disabled value="production" inputValue="Production">
                            <ComboboxControl class="w-52">
                                <ComboboxInput placeholder="Environment…" />
                                <ComboboxClear />
                                <ComboboxTrigger />
                            </ComboboxControl>
                            <ComboboxContent>
                                <ComboboxItem value="production">Production</ComboboxItem>
                                <ComboboxItem value="staging">Staging</ComboboxItem>
                            </ComboboxContent>
                        </Combobox>
                    </div>
                </SunkenWell>
            </div>

            <div class="flex flex-wrap items-center gap-6">
                <div class="flex flex-col gap-1.5">
                    <span class="text-xs font-medium text-weak">openOnFocus</span>
                    <Combobox variant="soft" size="md" openOnFocus bind:value={openOnFocusValue}>
                        <ComboboxControl class="w-52">
                            <ComboboxInput placeholder="Focus to open…" />
                            <ComboboxClear />
                            <ComboboxTrigger />
                        </ComboboxControl>
                        <ComboboxContent>
                            <ComboboxEmpty />
                            <ComboboxItem value="berlin">Berlin</ComboboxItem>
                            <ComboboxItem value="london">London</ComboboxItem>
                            <ComboboxItem value="tokyo">Tokyo</ComboboxItem>
                            <ComboboxItem value="zurich">Zurich</ComboboxItem>
                        </ComboboxContent>
                    </Combobox>
                </div>

                <div class="flex flex-col gap-1.5">
                    <span class="text-xs font-medium text-weak">allowCustomValue</span>
                    <Combobox
                        variant="soft"
                        size="md"
                        allowCustomValue
                        bind:value={customValue}
                        bind:inputValue={customInputValue}
                    >
                        <ComboboxControl class="w-52">
                            <ComboboxInput placeholder="Type or pick a tag…" />
                            <ComboboxClear />
                            <ComboboxTrigger />
                        </ComboboxControl>
                        <ComboboxContent>
                            <ComboboxEmpty>Press Enter to use custom value.</ComboboxEmpty>
                            <ComboboxItem value="accessibility">accessibility</ComboboxItem>
                            <ComboboxItem value="design-systems">design-systems</ComboboxItem>
                            <ComboboxItem value="svelte">svelte</ComboboxItem>
                            <ComboboxItem value="typescript">typescript</ComboboxItem>
                        </ComboboxContent>
                    </Combobox>
                </div>
            </div>
        </div>
    </PreviewSection>
</div>
