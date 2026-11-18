<script module>
    export const id = "select";
    export const label = "Select";
</script>

<script lang="ts">
    import {
        Compass,
        FileText,
        Folder,
        Globe,
        Layers,
        Lock,
        Settings,
        Shield,
        Sparkles,
        Users,
        Zap,
    } from "@lucide/svelte";
    import { Badge, BadgeLabel } from "cs/svelte/badge";
    import { Kbd } from "cs/svelte/kbd";
    import {
        SELECT_SIZES,
        Select,
        SelectContent,
        SelectGroup,
        SelectGroupLabel,
        SelectItem,
        SelectItemDescription,
        SelectItemIcon,
        SelectItemText,
        SelectSeparator,
        SelectTrigger,
        SelectValue,
        type SelectSize,
    } from "cs/svelte/select";
    import { TextInput, TextInputField } from "cs/svelte/text-input";

    import { PreviewHeader, PreviewSection, SunkenWell } from "../../../playground/components/index.ts";

    let softValue = $state("");
    let softInputValue = $state("");
    let elevatedValue = $state("");
    let elevatedInputValue = $state("");

    let sizeValues = $state<Record<SelectSize, string>>({
        xs: "pro",
        sm: "pro",
        md: "pro",
        lg: "pro",
        xl: "pro",
    });

    let plainValue = $state("system");
    let iconValue = $state("public");
    let descriptionValue = $state("fast");
    let trailingValue = $state("workspace");

    let groupValue = $state("in-progress");
    let cityValue = $state("seoul");

    let invalidSoftValue = $state("");
    let invalidElevatedValue = $state("");
    let anchorWidthValue = $state("branch-protection");
    let minAnchorWidthValue = $state("branch-protection");

    const cities = [
        { value: "amsterdam", label: "Amsterdam" },
        { value: "austin", label: "Austin" },
        { value: "berlin", label: "Berlin" },
        { value: "chicago", label: "Chicago" },
        { value: "london", label: "London" },
        { value: "los-angeles", label: "Los Angeles" },
        { value: "new-delhi", label: "New Delhi" },
        { value: "new-york", label: "New York" },
        { value: "paris", label: "Paris" },
        { value: "san-diego", label: "San Diego" },
        { value: "san-francisco", label: "San Francisco" },
        { value: "seoul", label: "Seoul" },
        { value: "singapore", label: "Singapore" },
        { value: "stockholm", label: "Stockholm" },
        { value: "sydney", label: "Sydney" },
        { value: "tokyo", label: "Tokyo" },
        { value: "toronto", label: "Toronto" },
        { value: "zurich", label: "Zurich" },
    ] as const;

    const closeScript = ["</", "script>"].join("");

    /* eslint-disable unicorn/no-incorrect-template-string-interpolation -- Svelte code snippets contain literal {Component} bindings */
    const variantsCode = `<script lang="ts">
    import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "cs/svelte/select";

    let value = $state("");
${closeScript}

<Select variant="soft" size="md" bind:value>
    <SelectTrigger class="w-48">
        <SelectValue placeholder="Select role…" />
    </SelectTrigger>
    <SelectContent>
        <SelectItem value="designer">Designer</SelectItem>
        <SelectItem value="engineer">Engineer</SelectItem>
        <SelectItem value="product">Product</SelectItem>
    </SelectContent>
</Select>

<Select variant="elevated" size="md" bind:value>
    <SelectTrigger class="w-48">
        <SelectValue placeholder="Select role…" />
    </SelectTrigger>
    <SelectContent>
        <SelectItem value="designer">Designer</SelectItem>
        <SelectItem value="engineer">Engineer</SelectItem>
        <SelectItem value="product">Product</SelectItem>
    </SelectContent>
</Select>`;

    const sizesCode = `<Select variant="soft" size="xs" bind:value>...</Select>
<Select variant="soft" size="sm" bind:value>...</Select>
<Select variant="soft" size="md" bind:value>...</Select>
<Select variant="soft" size="lg" bind:value>...</Select>
<Select variant="soft" size="xl" bind:value>...</Select>`;

    const richItemsCode = `<!-- Icon + Text + Description -->
<SelectItem value="fast">
    <SelectItemIcon icon={Zap} />
    <SelectItemText>Fast</SelectItemText>
    <SelectItemDescription>Quick replies for daily work</SelectItemDescription>
</SelectItem>

<!-- Trailing Badge / Kbd -->
<SelectItem value="workspace">
    <SelectItemIcon icon={Layers} />
    <SelectItemText>Workspace</SelectItemText>
    <Badge variant="soft" color="accent" size="xs">
        <BadgeLabel>Pro</BadgeLabel>
    </Badge>
</SelectItem>

<SelectItem value="projects">
    <SelectItemIcon icon={Folder} />
    <SelectItemText>Projects</SelectItemText>
    <Kbd variant="soft" size="xs">1</Kbd>
</SelectItem>`;

    const groupsCode = `<Select variant="soft" size="md" bind:value>
    <SelectTrigger class="w-56">
        <SelectValue placeholder="Select status…" />
    </SelectTrigger>
    <SelectContent>
        <SelectGroup>
            <SelectGroupLabel>Active</SelectGroupLabel>
            <SelectItem value="backlog">Backlog</SelectItem>
            <SelectItem value="in-progress">In Progress</SelectItem>
            <SelectItem value="in-review">In Review</SelectItem>
        </SelectGroup>
        <SelectGroup>
            <SelectGroupLabel>Closed</SelectGroupLabel>
            <SelectItem value="done">Done</SelectItem>
            <SelectItem value="archived" disabled>Archived</SelectItem>
        </SelectGroup>
        <SelectSeparator />
        <SelectItem value="unassigned">Unassigned</SelectItem>
    </SelectContent>
</Select>`;

    const scrollTypeaheadCode = `<Select variant="soft" size="md" bind:value={city}>
    <SelectTrigger class="w-56">
        <SelectValue placeholder="Select city…" />
    </SelectTrigger>
    <SelectContent>
        {#each cities as item (item.value)}
            <SelectItem value={item.value}>{item.label}</SelectItem>
        {/each}
    </SelectContent>
</Select>`;

    const statesWidthCode = `<Select variant="soft" size="md" invalid bind:value>...</Select>
<Select variant="elevated" size="md" disabled value="locked">...</Select>

<Select variant="soft" size="md" bind:value>
    <SelectTrigger class="w-36">
        <SelectValue placeholder="Choose rule…" />
    </SelectTrigger>
    <SelectContent width="anchor">...</SelectContent>
</Select>`;
    /* eslint-enable unicorn/no-incorrect-template-string-interpolation */
</script>

<div class="flex flex-col gap-10">
    <PreviewHeader
        title="Select"
        description="Single-choice dropdown trigger and floating listbox with soft and elevated surfaces, rich items, and typeahead."
    />

    <PreviewSection
        title="Variants"
        description="Compare soft and elevated surfaces alongside TextInput for height and squircle parity."
        code={variantsCode}
    >
        <div class="flex flex-wrap items-center gap-6">
            <div class="flex flex-col gap-1.5">
                <span class="text-xs font-medium text-weak">soft</span>
                <div class="flex items-center gap-3">
                    <Select variant="soft" size="md" bind:value={softValue}>
                        <SelectTrigger class="w-44">
                            <SelectValue placeholder="Select role…" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="designer">Designer</SelectItem>
                            <SelectItem value="engineer">Engineer</SelectItem>
                            <SelectItem value="product">Product</SelectItem>
                            <SelectItem value="research">Research</SelectItem>
                        </SelectContent>
                    </Select>

                    <TextInput variant="soft" size="md" class="w-44">
                        <TextInputField bind:value={softInputValue} placeholder="Full name" />
                    </TextInput>
                </div>
            </div>

            <SunkenWell>
                <div class="flex flex-col gap-1.5">
                    <span class="text-xs font-medium text-weak">elevated</span>
                    <div class="flex items-center gap-3">
                        <Select variant="elevated" size="md" bind:value={elevatedValue}>
                            <SelectTrigger class="w-44">
                                <SelectValue placeholder="Select role…" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="designer">Designer</SelectItem>
                                <SelectItem value="engineer">Engineer</SelectItem>
                                <SelectItem value="product">Product</SelectItem>
                                <SelectItem value="research">Research</SelectItem>
                            </SelectContent>
                        </Select>

                        <TextInput variant="elevated" size="md" class="w-44">
                            <TextInputField bind:value={elevatedInputValue} placeholder="Full name" />
                        </TextInput>
                    </div>
                </div>
            </SunkenWell>
        </div>
    </PreviewSection>

    <PreviewSection
        title="Sizes"
        description="Five T-shirt sizes from xs through xl matching TextInput and Button heights."
        code={sizesCode}
    >
        <div class="flex flex-col items-start gap-3">
            {#each SELECT_SIZES as size (size)}
                <div class="flex items-center gap-3">
                    <span class="w-6 text-xs font-medium text-weak uppercase">{size}</span>
                    <Select variant="soft" {size} bind:value={sizeValues[size]}>
                        <SelectTrigger class="w-52">
                            <SelectValue placeholder="Select plan…" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="starter">Starter</SelectItem>
                            <SelectItem value="pro">Pro</SelectItem>
                            <SelectItem value="team">Team</SelectItem>
                            <SelectItem value="enterprise">Enterprise</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            {/each}
        </div>
    </PreviewSection>

    <PreviewSection
        title="Rich Items"
        description="Plain text, mirrored icons, descriptions, and trailing badges or shortcuts."
        code={richItemsCode}
    >
        <div class="flex flex-wrap items-start gap-5">
            <div class="flex flex-col gap-1.5">
                <span class="text-xs font-medium text-weak">Plain</span>
                <Select variant="soft" size="md" bind:value={plainValue}>
                    <SelectTrigger class="w-44">
                        <SelectValue placeholder="Select theme…" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="light">Light</SelectItem>
                        <SelectItem value="dark">Dark</SelectItem>
                        <SelectItem value="system">System</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <div class="flex flex-col gap-1.5">
                <span class="text-xs font-medium text-weak">Icons</span>
                <Select variant="soft" size="md" bind:value={iconValue}>
                    <SelectTrigger class="w-44">
                        <SelectValue placeholder="Visibility…" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="public">
                            <SelectItemIcon icon={Globe} />
                            <SelectItemText>Public</SelectItemText>
                        </SelectItem>
                        <SelectItem value="team">
                            <SelectItemIcon icon={Users} />
                            <SelectItemText>Team</SelectItemText>
                        </SelectItem>
                        <SelectItem value="private">
                            <SelectItemIcon icon={Lock} />
                            <SelectItemText>Private</SelectItemText>
                        </SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <div class="flex flex-col gap-1.5">
                <span class="text-xs font-medium text-weak">Descriptions</span>
                <Select variant="soft" size="md" bind:value={descriptionValue}>
                    <SelectTrigger class="w-52">
                        <SelectValue placeholder="Select mode…" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="fast">
                            <SelectItemIcon icon={Zap} />
                            <SelectItemText>Fast</SelectItemText>
                            <SelectItemDescription>Quick replies for daily work</SelectItemDescription>
                        </SelectItem>
                        <SelectItem value="balanced">
                            <SelectItemIcon icon={Sparkles} />
                            <SelectItemText>Balanced</SelectItemText>
                            <SelectItemDescription>Everyday reasoning and writing</SelectItemDescription>
                        </SelectItem>
                        <SelectItem value="deep">
                            <SelectItemIcon icon={Compass} />
                            <SelectItemText>Deep</SelectItemText>
                            <SelectItemDescription>Thorough research and analysis</SelectItemDescription>
                        </SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <div class="flex flex-col gap-1.5">
                <span class="text-xs font-medium text-weak">Trailing</span>
                <Select variant="soft" size="md" bind:value={trailingValue}>
                    <SelectTrigger class="w-56">
                        <SelectValue placeholder="Go to…" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="workspace">
                            <SelectItemIcon icon={Layers} />
                            <SelectItemText>Workspace</SelectItemText>
                            <Badge variant="soft" color="accent" size="xs">
                                <BadgeLabel>Pro</BadgeLabel>
                            </Badge>
                        </SelectItem>
                        <SelectItem value="security">
                            <SelectItemIcon icon={Shield} />
                            <SelectItemText>Security</SelectItemText>
                            <Badge variant="soft" color="positive" size="xs">
                                <BadgeLabel>New</BadgeLabel>
                            </Badge>
                        </SelectItem>
                        <SelectItem value="projects">
                            <SelectItemIcon icon={Folder} />
                            <SelectItemText>Projects</SelectItemText>
                            <Kbd variant="soft" size="xs">1</Kbd>
                        </SelectItem>
                        <SelectItem value="documents">
                            <SelectItemIcon icon={FileText} />
                            <SelectItemText>Documents</SelectItemText>
                            <Kbd variant="soft" size="xs">2</Kbd>
                        </SelectItem>
                        <SelectItem value="settings">
                            <SelectItemIcon icon={Settings} />
                            <SelectItemText>Settings</SelectItemText>
                        </SelectItem>
                    </SelectContent>
                </Select>
            </div>
        </div>
    </PreviewSection>

    <PreviewSection
        title="Groups & Separators"
        description="Organize options with group headings, separators, and disabled items."
        code={groupsCode}
    >
        <Select variant="soft" size="md" bind:value={groupValue}>
            <SelectTrigger class="w-56">
                <SelectValue placeholder="Select status…" />
            </SelectTrigger>
            <SelectContent>
                <SelectGroup>
                    <SelectGroupLabel>Active</SelectGroupLabel>
                    <SelectItem value="backlog">Backlog</SelectItem>
                    <SelectItem value="in-progress">In Progress</SelectItem>
                    <SelectItem value="in-review">In Review</SelectItem>
                </SelectGroup>
                <SelectGroup>
                    <SelectGroupLabel>Closed</SelectGroupLabel>
                    <SelectItem value="done">Done</SelectItem>
                    <SelectItem value="archived" disabled>Archived</SelectItem>
                </SelectGroup>
                <SelectSeparator />
                <SelectItem value="unassigned">Unassigned</SelectItem>
            </SelectContent>
        </Select>
    </PreviewSection>

    <PreviewSection
        title="Scroll & Typeahead"
        description="Long lists scroll inside ScrollArea with edge fades and prefix typeahead."
        code={scrollTypeaheadCode}
    >
        <Select variant="soft" size="md" bind:value={cityValue}>
            <SelectTrigger class="w-56">
                <SelectValue placeholder="Select city…" />
            </SelectTrigger>
            <SelectContent>
                {#each cities as city (city.value)}
                    <SelectItem value={city.value}>{city.label}</SelectItem>
                {/each}
            </SelectContent>
        </Select>
    </PreviewSection>

    <PreviewSection
        title="States & Width"
        description="Invalid and disabled states across both variants, plus anchor vs min-anchor width."
        code={statesWidthCode}
    >
        <div class="flex flex-col gap-5">
            <div class="flex flex-wrap items-center gap-6">
                <div class="flex flex-col gap-1.5">
                    <span class="text-xs font-medium text-weak">Invalid soft</span>
                    <Select variant="soft" size="md" invalid bind:value={invalidSoftValue}>
                        <SelectTrigger class="w-48">
                            <SelectValue placeholder="Select region…" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="us-east">US East</SelectItem>
                            <SelectItem value="eu-west">EU West</SelectItem>
                            <SelectItem value="ap-south">AP South</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <SunkenWell>
                    <div class="flex flex-col gap-1.5">
                        <span class="text-xs font-medium text-weak">Invalid elevated</span>
                        <Select variant="elevated" size="md" invalid bind:value={invalidElevatedValue}>
                            <SelectTrigger class="w-48">
                                <SelectValue placeholder="Select region…" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="us-east">US East</SelectItem>
                                <SelectItem value="eu-west">EU West</SelectItem>
                                <SelectItem value="ap-south">AP South</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </SunkenWell>
            </div>

            <div class="flex flex-wrap items-center gap-6">
                <div class="flex flex-col gap-1.5">
                    <span class="text-xs font-medium text-weak">Disabled soft</span>
                    <Select variant="soft" size="md" disabled value="production">
                        <SelectTrigger class="w-48">
                            <SelectValue placeholder="Environment…" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="production">Production</SelectItem>
                            <SelectItem value="staging">Staging</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <SunkenWell>
                    <div class="flex flex-col gap-1.5">
                        <span class="text-xs font-medium text-weak">Disabled elevated</span>
                        <Select variant="elevated" size="md" disabled value="production">
                            <SelectTrigger class="w-48">
                                <SelectValue placeholder="Environment…" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="production">Production</SelectItem>
                                <SelectItem value="staging">Staging</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </SunkenWell>
            </div>

            <div class="flex flex-wrap items-center gap-6">
                <div class="flex flex-col gap-1.5">
                    <span class="text-xs font-medium text-weak">anchor</span>
                    <Select variant="soft" size="md" bind:value={anchorWidthValue}>
                        <SelectTrigger class="w-36">
                            <SelectValue placeholder="Choose rule…" />
                        </SelectTrigger>
                        <SelectContent width="anchor">
                            <SelectItem value="branch-protection">Branch Protection</SelectItem>
                            <SelectItem value="preview-deployments">Preview Deployments</SelectItem>
                            <SelectItem value="release-automation">Release Automation</SelectItem>
                            <SelectItem value="merge-queue">Merge Queue</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div class="flex flex-col gap-1.5">
                    <span class="text-xs font-medium text-weak">min-anchor</span>
                    <Select variant="soft" size="md" bind:value={minAnchorWidthValue}>
                        <SelectTrigger class="w-36">
                            <SelectValue placeholder="Choose rule…" />
                        </SelectTrigger>
                        <SelectContent width="min-anchor">
                            <SelectItem value="branch-protection">Branch Protection</SelectItem>
                            <SelectItem value="preview-deployments">Preview Deployments</SelectItem>
                            <SelectItem value="release-automation">Release Automation</SelectItem>
                            <SelectItem value="merge-queue">Merge Queue</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>
        </div>
    </PreviewSection>
</div>
