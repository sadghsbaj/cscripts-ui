<script module lang="ts">
    export const id = "upload-area";
    export const label = "UploadArea";
</script>

<script lang="ts">
    import { onDestroy } from "svelte";
    import { SvelteMap } from "svelte/reactivity";
    import { Card, CardBody, CardDescription, CardHeader, CardTitle } from "cs/svelte/card";
    import {
        UPLOAD_AREA_SIZES,
        UploadArea,
        type UploadAreaItem,
    } from "cs/svelte/upload-area";

    import { PreviewHeader, PreviewSection } from "../../../playground/components/index.ts";

    let basicFiles = $state<File[]>([]);
    let singleFiles = $state<File[]>([]);
    let multiFiles = $state<File[]>([]);

    let asyncItems = $state<UploadAreaItem[]>([
        {
            id: "asset-1",
            name: "brand-guidelines.pdf",
            size: 2_411_724,
            status: "done",
        },
        {
            id: "asset-2",
            name: "hero-banner.png",
            size: 4_823_449,
            status: "uploading",
            progress: 48,
        },
        {
            id: "asset-3",
            name: "product-demo.mp4",
            size: 9_122_611,
            status: "error",
            progress: 72,
            error: "Connection interrupted",
        },
    ]);

    const timers = new SvelteMap<string, ReturnType<typeof setInterval>>();

    function startSimulatedUpload(itemId: string, startProgress = 0): void {
        const existingTimer = timers.get(itemId);
        if (existingTimer) {
            clearInterval(existingTimer);
            timers.delete(itemId);
        }

        asyncItems = asyncItems.map((item) =>
            item.id === itemId
                ? { ...item, status: "uploading", progress: startProgress, error: undefined }
                : item
        );

        const timer = setInterval(() => {
            let completed = false;
            asyncItems = asyncItems.map((item) => {
                if (item.id !== itemId || item.status !== "uploading") return item;
                const nextProgress = Math.min(100, (item.progress ?? 0) + 8);
                if (nextProgress >= 100) {
                    completed = true;
                    return { ...item, status: "done", progress: 100 };
                }
                return { ...item, progress: nextProgress };
            });

            if (completed) {
                clearInterval(timer);
                timers.delete(itemId);
            }
        }, 280);

        timers.set(itemId, timer);
    }

    // Start advancing the initial uploading demo item gently on mount.
    startSimulatedUpload("asset-2", 48);

    onDestroy(() => {
        for (const timer of timers.values()) {
            clearInterval(timer);
        }
        timers.clear();
    });

    function handleAsyncFilesChange(nextFiles: File[]): void {
        for (const file of nextFiles) {
            const itemId = `${file.name}-${file.size}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
            asyncItems = [
                ...asyncItems,
                {
                    id: itemId,
                    file,
                    name: file.name,
                    size: file.size,
                    status: "uploading",
                    progress: 0,
                },
            ];
            startSimulatedUpload(itemId, 0);
        }
    }

    function handleAsyncCancel(item: UploadAreaItem): void {
        const timer = timers.get(item.id);
        if (timer) {
            clearInterval(timer);
            timers.delete(item.id);
        }
        asyncItems = asyncItems.filter((entry) => entry.id !== item.id);
    }

    function handleAsyncRetry(item: UploadAreaItem): void {
        startSimulatedUpload(item.id, 0);
    }

    function handleAsyncRemove(item: UploadAreaItem): void {
        const timer = timers.get(item.id);
        if (timer) {
            clearInterval(timer);
            timers.delete(item.id);
        }
        asyncItems = asyncItems.filter((entry) => entry.id !== item.id);
    }

    const closeScript = ["</", "script>"].join("");

    /* eslint-disable unicorn/no-incorrect-template-string-interpolation -- Svelte code snippets contain literal {Component} bindings */
    const basicCode = `<script lang="ts">
    import { UploadArea } from "cs/svelte/upload-area";

    let files = $state<File[]>([]);
${closeScript}

<UploadArea
    variant="soft"
    size="md"
    bind:files
    description="PDF, PNG, or JPG up to 5 MB"
/>`;

    const variantsCode = `<UploadArea variant="soft" size="md" description="SVG, PNG, or PDF" />

<UploadArea variant="elevated" size="md" description="SVG, PNG, or PDF" />

<Card variant="elevated" size="md">
    <CardHeader>
        <CardTitle>Project Assets</CardTitle>
        <CardDescription>Upload design tokens or brand artwork.</CardDescription>
    </CardHeader>
    <CardBody>
        <UploadArea variant="sunken" size="md" description="SVG, PNG, or PDF" />
    </CardBody>
</Card>`;

    const sizesCode = `<UploadArea variant="soft" size="sm" description="Max 5 MB" />
<UploadArea variant="soft" size="md" description="PDF or PNG, max 5 MB" />
<UploadArea variant="soft" size="lg" description="PDF, PNG, or SVG, max 10 MB" />`;

    const modesCode = `<UploadArea
    variant="soft"
    size="md"
    bind:files={avatarFiles}
    accept="image/png,image/jpeg,application/pdf"
    maxSize={5 * 1024 * 1024}
    description="Single file, max 5 MB"
/>

<UploadArea
    variant="soft"
    size="md"
    multiple
    bind:files={attachmentFiles}
    accept="image/*,.pdf"
    maxSize={5 * 1024 * 1024}
    maxFiles={4}
    description="Up to 4 files, max 5 MB each"
/>`;

    const asyncCode = `<UploadArea
    variant="soft"
    size="md"
    multiple
    items={asyncItems}
    onFilesChange={handleFilesChange}
    onCancel={handleCancel}
    onRetry={handleRetry}
    onRemove={handleRemove}
    description="Drop files to simulate upload progress"
/>`;

    const statesCode = `<UploadArea
    variant="soft"
    size="md"
    invalid
    error="File exceeds 5 MB"
    description="PDF or PNG, max 5 MB"
/>

<UploadArea variant="soft" size="md" disabled description="Uploads locked" />
<UploadArea variant="elevated" size="md" disabled description="Uploads locked" />`;
    /* eslint-enable unicorn/no-incorrect-template-string-interpolation */
</script>

<div class="flex flex-col gap-10">
    <PreviewHeader
        title="UploadArea"
        description="Drag-and-drop and click-to-browse file upload surface with client-side validation and optional async progress."
    />

    <PreviewSection title="Basic" code={basicCode}>
        <div class="w-full max-w-lg">
            <UploadArea
                variant="soft"
                size="md"
                bind:files={basicFiles}
                description="PDF, PNG, or JPG up to 5 MB"
            />
        </div>
    </PreviewSection>

    <PreviewSection
        title="Variants"
        description="Use soft everywhere, elevated on canvas, and sunken inside elevated cards."
        code={variantsCode}
    >
        <div class="grid w-full max-w-3xl grid-cols-1 items-center gap-6 md:grid-cols-2">
            <UploadArea
                variant="soft"
                size="md"
                label="Attach invoice"
                description="PDF up to 5 MB"
            />

            <div class="rounded-2xl squircle-soft bg-canvas p-6 border border-transparent">
                <UploadArea
                    variant="elevated"
                    size="md"
                    label="Upload cover image"
                    description="PNG or JPG up to 10 MB"
                />
            </div>

            <div class="md:col-span-2">
                <Card variant="elevated" size="md">
                    <CardHeader>
                        <CardTitle>Project Assets</CardTitle>
                        <CardDescription>Upload design tokens or brand artwork.</CardDescription>
                    </CardHeader>
                    <CardBody>
                        <UploadArea
                            variant="sunken"
                            size="md"
                            description="SVG, PNG, or PDF up to 10 MB"
                        />
                    </CardBody>
                </Card>
            </div>
        </div>
    </PreviewSection>

    <PreviewSection
        title="Sizes"
        description="Three sizes (sm, md, lg) scaling height, padding, icon size, and corner radius."
        code={sizesCode}
    >
        <div class="flex w-full max-w-lg flex-col gap-4">
            {#each UPLOAD_AREA_SIZES as size (size)}
                <UploadArea
                    variant="soft"
                    {size}
                    description={size === "sm" ? "Max 5 MB" : "PDF, PNG, or SVG up to 10 MB"}
                />
            {/each}
        </div>
    </PreviewSection>

    <PreviewSection
        title="Single & Multiple"
        description="Single-file replacement vs. multi-file list with accept, maxSize, and maxFiles limits."
        code={modesCode}
    >
        <div class="grid w-full max-w-3xl grid-cols-1 gap-6 md:grid-cols-2">
            <UploadArea
                variant="soft"
                size="md"
                bind:files={singleFiles}
                accept="image/png,image/jpeg,application/pdf"
                maxSize={5 * 1024 * 1024}
                description="Single file, max 5 MB"
            />

            <UploadArea
                variant="soft"
                size="md"
                multiple
                bind:files={multiFiles}
                accept="image/*,.pdf"
                maxSize={5 * 1024 * 1024}
                maxFiles={4}
                description="Up to 4 files, max 5 MB each"
            />
        </div>
    </PreviewSection>

    <PreviewSection
        title="Async Upload"
        description="Controlled items mode with live progress, error recovery, cancellation, and removal."
        code={asyncCode}
    >
        <div class="w-full max-w-lg">
            <UploadArea
                variant="soft"
                size="md"
                multiple
                files={[]}
                items={asyncItems}
                onFilesChange={handleAsyncFilesChange}
                onCancel={handleAsyncCancel}
                onRetry={handleAsyncRetry}
                onRemove={handleAsyncRemove}
                description="Drop files to simulate upload progress"
            />
        </div>
    </PreviewSection>

    <PreviewSection
        title="States"
        description="Validation errors and disabled surfaces across variants."
        code={statesCode}
    >
        <div class="grid w-full max-w-3xl grid-cols-1 items-center gap-6 md:grid-cols-2">
            <div class="md:col-span-2">
                <UploadArea
                    variant="soft"
                    size="md"
                    invalid
                    error="File exceeds 5 MB"
                    description="PDF or PNG, max 5 MB"
                />
            </div>

            <UploadArea
                variant="soft"
                size="md"
                disabled
                description="Uploads locked"
            />

            <div class="rounded-2xl squircle-soft bg-canvas p-6 border border-transparent">
                <UploadArea
                    variant="elevated"
                    size="md"
                    disabled
                    description="Uploads locked"
                />
            </div>
        </div>
    </PreviewSection>
</div>
