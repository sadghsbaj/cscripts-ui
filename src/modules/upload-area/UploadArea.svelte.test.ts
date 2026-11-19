import { createRawSnippet, flushSync, mount, unmount } from "svelte";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import {
    UPLOAD_AREA_SIZES,
    UPLOAD_AREA_VARIANTS,
    UploadArea,
    type UploadAreaItem,
    type UploadAreaProps,
    type UploadAreaRejection,
    type UploadAreaSize,
    type UploadAreaVariant,
} from "./index.ts";

function makeFile(name: string, size = 128, type = "text/plain"): File {
    const content = size > 0 ? new Uint8Array(size) : new Uint8Array(0);
    return new File([content], name, { type });
}

function createMockFileList(files: File[]): FileList {
    const fileList: Record<number | string, unknown> = {
        length: files.length,
        item: (index: number) => files[index] ?? null,
        [Symbol.iterator]: function* () {
            yield* files;
        },
    };
    for (const [i, file] of files.entries()) {
        fileList[i] = file;
    }
    return fileList as unknown as FileList;
}

function selectFilesViaInput(input: HTMLInputElement, files: File[]): void {
    Object.defineProperty(input, "files", {
        value: createMockFileList(files),
        configurable: true,
    });
    input.dispatchEvent(new Event("change", { bubbles: true }));
    flushSync();
}

function dispatchDragEvent(
    target: EventTarget,
    type: "dragenter" | "dragover" | "dragleave" | "drop" | "dragend",
    options: { files?: File[]; types?: string[] } = {},
): Event & { dataTransfer: DataTransfer } {
    const event = new Event(type, { bubbles: true, cancelable: true }) as Event & {
        dataTransfer: DataTransfer;
    };
    const files = options.files ?? [];
    const dataTransfer = {
        files: createMockFileList(files),
        types: options.types ?? (files.length > 0 ? ["Files"] : ["Files"]),
        dropEffect: "none",
    } as unknown as DataTransfer;

    Object.defineProperty(event, "dataTransfer", {
        value: dataTransfer,
        configurable: true,
    });
    target.dispatchEvent(event);
    flushSync();
    return event;
}

describe("UploadArea Svelte 5 Component", () => {
    let container: HTMLDivElement;

    function getRoot(): HTMLDivElement {
        const el = container.querySelector<HTMLDivElement>(".cs-upload-area");
        if (!el) throw new Error("Expected .cs-upload-area");
        return el;
    }

    function getInput(): HTMLInputElement {
        const el = container.querySelector<HTMLInputElement>("input.cs-upload-area-input");
        if (!el) throw new Error("Expected input.cs-upload-area-input");
        return el;
    }

    function getDropzone(): HTMLButtonElement | null {
        return container.querySelector<HTMLButtonElement>("button.cs-upload-area-dropzone");
    }

    function getErrorEl(): HTMLParagraphElement | null {
        return container.querySelector<HTMLParagraphElement>(".cs-upload-area-error");
    }

    beforeEach(() => {
        container = document.createElement("div");
        document.body.append(container);
    });

    afterEach(() => {
        container.remove();
        vi.restoreAllMocks();
    });

    describe("Exports & Rendering", () => {
        test("exports UploadArea and canonical option arrays from index.ts", () => {
            expect(UploadArea).toBeTypeOf("function");
            expect(UPLOAD_AREA_VARIANTS).toEqual(["soft", "elevated", "sunken"]);
            expect(UPLOAD_AREA_SIZES).toEqual(["sm", "md", "lg"]);

            const variantCheck: UploadAreaVariant = "soft";
            const sizeCheck: UploadAreaSize = "md";
            const propsCheck: UploadAreaProps = {
                variant: variantCheck,
                size: sizeCheck,
            };
            expect(propsCheck.variant).toBe("soft");
        });

        test("renders default state attributes on root without spurious flags", () => {
            const instance = mount(UploadArea, {
                target: container,
                props: { variant: "soft", size: "md" },
            });
            flushSync();

            const root = getRoot();
            expect(root.dataset.variant).toBe("soft");
            expect(root.dataset.size).toBe("md");
            expect(root.dataset.status).toBe("idle");
            expect(root.dataset.disabled).toBeUndefined();
            expect(root.dataset.invalid).toBeUndefined();
            expect(root.dataset.dragging).toBeUndefined();
            expect(root.dataset.hasFiles).toBeUndefined();
            expect(getDropzone()).not.toBeNull();

            unmount(instance);
        });

        test.each(UPLOAD_AREA_VARIANTS)("renders data-variant=%s", (variant) => {
            const instance = mount(UploadArea, {
                target: container,
                props: { variant, size: "md" },
            });
            flushSync();

            expect(getRoot().dataset.variant).toBe(variant);

            unmount(instance);
        });

        test.each(UPLOAD_AREA_SIZES)("renders data-size=%s", (size) => {
            const instance = mount(UploadArea, {
                target: container,
                props: { variant: "soft", size },
            });
            flushSync();

            expect(getRoot().dataset.size).toBe(size);

            unmount(instance);
        });

        test("applies disabled and invalid states to root, input, and dropzone", () => {
            const instance = mount(UploadArea, {
                target: container,
                props: {
                    variant: "elevated",
                    size: "sm",
                    disabled: true,
                    invalid: true,
                },
            });
            flushSync();

            const root = getRoot();
            const input = getInput();
            const dropzone = getDropzone();

            expect(root.dataset.disabled).toBe("");
            expect(root.dataset.invalid).toBe("");
            expect(input.disabled).toBe(true);
            expect(dropzone?.disabled).toBe(true);

            unmount(instance);
        });
    });

    describe("Single-file selection (multiple={false})", () => {
        test("selects file via input, renders in-place single view with no nested buttons, and removes cleanly", () => {
            let files = $state<File[]>([]);
            const onFilesChange = vi.fn();
            const onRemove = vi.fn();

            const instance = mount(UploadArea, {
                target: container,
                props: {
                    variant: "soft",
                    size: "md",
                    get files() {
                        return files;
                    },
                    set files(next) {
                        files = next;
                    },
                    onFilesChange,
                    onRemove,
                },
            });
            flushSync();

            const file = makeFile("avatar.png", 2048, "image/png");
            const input = getInput();
            selectFilesViaInput(input, [file]);

            expect(files).toEqual([file]);
            expect(onFilesChange).toHaveBeenCalledTimes(1);
            expect(onFilesChange).toHaveBeenCalledWith([file]);
            expect(input.value).toBe("");

            const root = getRoot();
            expect(root.dataset.hasFiles).toBe("");
            expect(getDropzone()).toBeNull();

            const single = root.querySelector<HTMLDivElement>(".cs-upload-area-single");
            expect(single).not.toBeNull();
            expect(single?.querySelector(".cs-upload-area-item-name")?.textContent).toBe("avatar.png");
            expect(single?.querySelector(":scope button button")).toBeNull();

            const removeBtn = single?.querySelector<HTMLButtonElement>(
                'button[aria-label="Remove avatar.png"]',
            );
            expect(removeBtn).not.toBeNull();
            removeBtn?.click();
            flushSync();

            expect(files).toEqual([]);
            expect(onFilesChange).toHaveBeenLastCalledWith([]);
            expect(onRemove).toHaveBeenCalledTimes(1);
            expect(root.dataset.hasFiles).toBeUndefined();
            expect(getDropzone()).not.toBeNull();

            unmount(instance);
        });

        test("respects read-only controlled bind:files setter without mutating external array", () => {
            const lockedFiles: File[] = [];
            const onFilesChange = vi.fn();

            const instance = mount(UploadArea, {
                target: container,
                props: {
                    variant: "sunken",
                    size: "md",
                    get files() {
                        return lockedFiles;
                    },
                    set files(_next) {
                        // no-op strict controlled setter
                    },
                    onFilesChange,
                },
            });
            flushSync();

            const file = makeFile("doc.pdf", 512, "application/pdf");
            selectFilesViaInput(getInput(), [file]);

            expect(lockedFiles).toEqual([]);
            expect(onFilesChange).toHaveBeenCalledWith([file]);
            expect(getRoot().dataset.hasFiles).toBeUndefined();
            expect(getDropzone()).not.toBeNull();

            unmount(instance);
        });
    });

    describe("Multi-file selection (multiple={true})", () => {
        test("keeps dropzone ready, renders list below, appends selections, and removes individual items", () => {
            let files = $state<File[]>([]);
            const onFilesChange = vi.fn();
            const onRemove = vi.fn();

            const instance = mount(UploadArea, {
                target: container,
                props: {
                    variant: "soft",
                    size: "md",
                    multiple: true,
                    get files() {
                        return files;
                    },
                    set files(next) {
                        files = next;
                    },
                    onFilesChange,
                    onRemove,
                },
            });
            flushSync();

            const f1 = makeFile("first.txt", 100);
            const f2 = makeFile("second.txt", 200);
            const f3 = makeFile("third.txt", 300);

            selectFilesViaInput(getInput(), [f1, f2]);
            expect(files).toEqual([f1, f2]);
            expect(getDropzone()).not.toBeNull();

            let listItems = container.querySelectorAll(":scope ul.cs-upload-area-list > li.cs-upload-area-item");
            expect(listItems).toHaveLength(2);

            selectFilesViaInput(getInput(), [f3]);
            expect(files).toEqual([f1, f2, f3]);
            listItems = container.querySelectorAll(":scope ul.cs-upload-area-list > li.cs-upload-area-item");
            expect(listItems).toHaveLength(3);

            const removeSecond = container.querySelector<HTMLButtonElement>(
                'button[aria-label="Remove second.txt"]',
            );
            removeSecond?.click();
            flushSync();

            expect(files).toEqual([f1, f3]);
            expect(onRemove).toHaveBeenCalledWith(
                expect.objectContaining({ name: "second.txt" }),
                1,
            );
            expect(onFilesChange).toHaveBeenLastCalledWith([f1, f3]);

            unmount(instance);
        });
    });

    describe("Validation & Error Handling", () => {
        test("rejects invalid accept, maxSize, and maxFiles, fires onReject, and clears error on valid selection", () => {
            let files = $state<File[]>([]);
            const rejectionsLog: UploadAreaRejection[][] = [];

            const instance = mount(UploadArea, {
                target: container,
                props: {
                    variant: "soft",
                    size: "md",
                    multiple: true,
                    accept: "image/*",
                    maxSize: 1024,
                    maxFiles: 2,
                    get files() {
                        return files;
                    },
                    set files(next) {
                        files = next;
                    },
                    onReject: (rejections) => {
                        rejectionsLog.push(rejections);
                    },
                },
            });
            flushSync();

            const root = getRoot();

            // 1. Type rejection
            const badType = makeFile("notes.txt", 100, "text/plain");
            selectFilesViaInput(getInput(), [badType]);
            expect(files).toEqual([]);
            expect(rejectionsLog.at(-1)).toEqual([{ file: badType, reason: "type" }]);
            expect(root.dataset.invalid).toBe("");
            expect(getErrorEl()?.textContent?.trim()).toBe("File type not supported");

            // 2. Size rejection
            const tooLarge = makeFile("huge.png", 2048, "image/png");
            selectFilesViaInput(getInput(), [tooLarge]);
            expect(files).toEqual([]);
            expect(rejectionsLog.at(-1)).toEqual([{ file: tooLarge, reason: "size" }]);
            expect(getErrorEl()?.textContent?.trim()).toBe("File exceeds 1 KB");

            // 3. Valid selection clears previous error
            const valid1 = makeFile("one.png", 512, "image/png");
            selectFilesViaInput(getInput(), [valid1]);
            expect(files).toEqual([valid1]);
            expect(root.dataset.invalid).toBeUndefined();
            expect(getErrorEl()).toBeNull();

            // 4. maxFiles rejection
            const valid2 = makeFile("two.png", 512, "image/png");
            const valid3 = makeFile("three.png", 512, "image/png");
            selectFilesViaInput(getInput(), [valid2, valid3]);
            expect(files).toEqual([valid1, valid2]);
            expect(rejectionsLog.at(-1)).toEqual([{ file: valid3, reason: "count" }]);
            expect(root.dataset.invalid).toBe("");
            expect(getErrorEl()?.textContent?.trim()).toBe("Maximum 2 files");

            unmount(instance);
        });
    });

    describe("Drag-and-Drop", () => {
        test("tracks dragDepth across nested children without premature flicker and resets on drop/dragend", () => {
            let files = $state<File[]>([]);
            const instance = mount(UploadArea, {
                target: container,
                props: {
                    variant: "soft",
                    size: "md",
                    get files() {
                        return files;
                    },
                    set files(next) {
                        files = next;
                    },
                },
            });
            flushSync();

            const root = getRoot();
            const dropzone = getDropzone();
            expect(dropzone).not.toBeNull();
            if (!dropzone) return;
            const child = dropzone.querySelector(".cs-upload-area-title");
            expect(child).not.toBeNull();
            if (!child) return;

            // Enter root -> depth 1
            dispatchDragEvent(root, "dragenter");
            expect(root.dataset.dragging).toBe("");

            // Enter nested child -> depth 2
            dispatchDragEvent(child, "dragenter");
            expect(root.dataset.dragging).toBe("");

            // Leave child -> depth 1 (still dragging, no flicker)
            dispatchDragEvent(child, "dragleave");
            expect(root.dataset.dragging).toBe("");

            // Leave root -> depth 0 (dragging ends)
            dispatchDragEvent(root, "dragleave");
            expect(root.dataset.dragging).toBeUndefined();

            // Dragover sets dropEffect and prevents default
            dispatchDragEvent(root, "dragenter");
            const overEvent = dispatchDragEvent(root, "dragover");
            expect(overEvent.defaultPrevented).toBe(true);
            expect(overEvent.dataTransfer.dropEffect).toBe("copy");

            // Drop resets dragging and processes file
            const droppedFile = makeFile("dropped.png", 256, "image/png");
            dispatchDragEvent(root, "drop", { files: [droppedFile] });
            expect(root.dataset.dragging).toBeUndefined();
            expect(files).toEqual([droppedFile]);

            // dragend also resets dragging
            dispatchDragEvent(root, "dragenter");
            expect(root.dataset.dragging).toBe("");
            dispatchDragEvent(root, "dragend");
            expect(root.dataset.dragging).toBeUndefined();

            unmount(instance);
        });

        test("ignores dragenter, dragover, and drop when disabled or non-file drag", () => {
            let disabled = $state(true);
            let files = $state<File[]>([]);
            const onFilesChange = vi.fn();

            const instance = mount(UploadArea, {
                target: container,
                props: {
                    variant: "soft",
                    size: "md",
                    get disabled() {
                        return disabled;
                    },
                    get files() {
                        return files;
                    },
                    set files(next) {
                        files = next;
                    },
                    onFilesChange,
                },
            });
            flushSync();

            const root = getRoot();
            const file = makeFile("blocked.png", 128, "image/png");

            dispatchDragEvent(root, "dragenter", { files: [file] });
            expect(root.dataset.dragging).toBeUndefined();

            dispatchDragEvent(root, "drop", { files: [file] });
            expect(files).toEqual([]);
            expect(onFilesChange).not.toHaveBeenCalled();

            // Enable and test non-file drag
            disabled = false;
            flushSync();
            dispatchDragEvent(root, "dragenter", { types: ["text/plain"] });
            expect(root.dataset.dragging).toBeUndefined();

            unmount(instance);
        });
    });

    describe("Async items mode", () => {
        test("renders uploading progress & Cancel, error & Retry, and done collapsed progress & Remove", () => {
            const uploadingItem: UploadAreaItem = {
                id: "1",
                name: "video.mp4",
                size: 2048,
                status: "uploading",
                progress: 42,
            };
            const errorItem: UploadAreaItem = {
                id: "2",
                name: "broken.pdf",
                size: 1024,
                status: "error",
                progress: 15,
                error: "Network timeout",
            };
            const doneItem: UploadAreaItem = {
                id: "3",
                name: "ready.png",
                size: 512,
                status: "done",
                progress: 100,
            };

            const items = $state<UploadAreaItem[]>([uploadingItem, errorItem, doneItem]);
            const onCancel = vi.fn();
            const onRetry = vi.fn();
            const onRemove = vi.fn();

            const instance = mount(UploadArea, {
                target: container,
                props: {
                    variant: "soft",
                    size: "md",
                    multiple: true,
                    get items() {
                        return items;
                    },
                    onCancel,
                    onRetry,
                    onRemove,
                },
            });
            flushSync();

            const rows = container.querySelectorAll<HTMLLIElement>("li.cs-upload-area-item");
            expect(rows).toHaveLength(3);
            const [row0, row1, row2] = rows;
            expect(row0).toBeDefined();
            expect(row1).toBeDefined();
            expect(row2).toBeDefined();
            if (!row0 || !row1 || !row2) return;

            // Uploading row
            expect(row0.dataset.itemStatus).toBe("uploading");
            expect(row0.querySelector(".cs-upload-area-progress")?.classList.contains("is-open")).toBe(true);
            expect(row0.querySelector('[role="progressbar"]')).not.toBeNull();
            const cancelBtn = [...row0.querySelectorAll("button")].find((b) =>
                b.textContent?.includes("Cancel"),
            );
            expect(cancelBtn).toBeDefined();
            cancelBtn?.click();
            expect(onCancel).toHaveBeenCalledWith(uploadingItem, 0);

            // Error row
            expect(row1.dataset.itemStatus).toBe("error");
            expect(row1.querySelector(".cs-upload-area-progress")?.classList.contains("is-open")).toBe(true);
            expect(row1.textContent).toContain("Network timeout");
            const retryBtn = [...row1.querySelectorAll("button")].find((b) =>
                b.textContent?.includes("Retry"),
            );
            expect(retryBtn).toBeDefined();
            retryBtn?.click();
            expect(onRetry).toHaveBeenCalledWith(errorItem, 1);

            // Done row
            expect(row2.dataset.itemStatus).toBe("done");
            const doneProgress = row2.querySelector(".cs-upload-area-progress");
            expect(doneProgress?.classList.contains("is-open")).toBe(false);
            expect(doneProgress?.hasAttribute("inert")).toBe(true);
            const removeBtn = row2.querySelector<HTMLButtonElement>(
                'button[aria-label="Remove ready.png"]',
            );
            expect(removeBtn).not.toBeNull();
            removeBtn?.click();
            expect(onRemove).toHaveBeenCalledWith(doneItem, 2);

            unmount(instance);
        });

        test("single-file error item sets root data-status='error' and data-invalid", () => {
            const instance = mount(UploadArea, {
                target: container,
                props: {
                    variant: "soft",
                    size: "md",
                    multiple: false,
                    items: [{ id: "1", name: "fail.pdf", status: "error", error: "Server 500" }],
                },
            });
            flushSync();

            const root = getRoot();
            expect(root.dataset.status).toBe("error");
            expect(root.dataset.invalid).toBe("");
            expect(root.querySelector('button[aria-label="Remove fail.pdf"]')).toBeNull();

            unmount(instance);
        });
    });

    describe("Accessibility", () => {
        test("wires aria-describedby for description and error, and renders live status region", () => {
            let error = $state<string | undefined>(undefined);
            const instance = mount(UploadArea, {
                target: container,
                props: {
                    variant: "soft",
                    size: "md",
                    id: "avatar-upload",
                    description: "PNG or JPG up to 2 MB",
                    get error() {
                        return error;
                    },
                },
            });
            flushSync();

            const input = getInput();
            expect(input.tabIndex).toBe(-1);
            expect(input.getAttribute("aria-hidden")).toBe("true");

            const dropzone = getDropzone();
            expect(dropzone).not.toBeNull();
            if (!dropzone) return;
            expect(dropzone.getAttribute("aria-describedby")).toBe("avatar-upload-description");
            expect(getErrorEl()).toBeNull();

            error = "Upload quota exceeded";
            flushSync();

            const errorEl = getErrorEl();
            expect(errorEl).not.toBeNull();
            expect(errorEl?.getAttribute("role")).toBe("status");
            expect(errorEl?.getAttribute("aria-live")).toBe("polite");
            expect(errorEl?.textContent?.trim()).toBe("Upload quota exceeded");
            expect(dropzone.getAttribute("aria-describedby")).toBe(
                "avatar-upload-description avatar-upload-error",
            );

            unmount(instance);
        });
    });

    describe("Custom snippets", () => {
        test("renders custom children dropzone snippet with reactive { dragging, disabled } context", () => {
            let disabled = $state(false);
            const children = createRawSnippet<[{ dragging: boolean; disabled: boolean }]>((getCtx) => ({
                render: () => {
                    const ctx = getCtx();
                    return `<span class="custom-dropzone" data-dragging="${String(ctx.dragging)}" data-disabled="${String(ctx.disabled)}">Custom Drop</span>`;
                },
                setup: (el) => {
                    $effect(() => {
                        const ctx = getCtx();
                        if (el instanceof HTMLElement) {
                            el.dataset.dragging = String(ctx.dragging);
                            el.dataset.disabled = String(ctx.disabled);
                        }
                    });
                },
            }));

            const instance = mount(UploadArea, {
                target: container,
                props: {
                    variant: "soft",
                    size: "md",
                    get disabled() {
                        return disabled;
                    },
                    children,
                },
            });
            flushSync();

            const root = getRoot();
            const custom = root.querySelector<HTMLElement>(":scope .custom-dropzone");
            expect(custom).not.toBeNull();
            expect(custom?.textContent).toBe("Custom Drop");
            expect(custom?.dataset.dragging).toBe("false");
            expect(custom?.dataset.disabled).toBe("false");
            expect(root.querySelector(":scope .cs-upload-area-title")).toBeNull();

            dispatchDragEvent(root, "dragenter");
            expect(custom?.dataset.dragging).toBe("true");

            dispatchDragEvent(root, "dragleave");
            expect(custom?.dataset.dragging).toBe("false");

            disabled = true;
            flushSync();
            expect(custom?.dataset.disabled).toBe("true");

            unmount(instance);
        });

        test("renders custom item snippet in both single-file and multi-file modes", () => {
            const itemSnippet = createRawSnippet<[UploadAreaItem, number]>((getItem, getIndex) => ({
                render: () => {
                    const entry = getItem();
                    const idx = getIndex();
                    return `<div class="custom-item-row" data-index="${String(idx)}">${entry.name} (#${String(idx)})</div>`;
                },
            }));

            // 1. Single-file mode
            const singleInstance = mount(UploadArea, {
                target: container,
                props: {
                    variant: "soft",
                    size: "md",
                    multiple: false,
                    files: [makeFile("single.png", 64, "image/png")],
                    item: itemSnippet,
                },
            });
            flushSync();

            const singleCustom = container.querySelector<HTMLElement>(
                ":scope .cs-upload-area-single .custom-item-row",
            );
            expect(singleCustom).not.toBeNull();
            expect(singleCustom?.textContent).toBe("single.png (#0)");
            expect(container.querySelector(":scope .cs-upload-area-single-row")).toBeNull();

            unmount(singleInstance);

            // 2. Multi-file mode
            const multiInstance = mount(UploadArea, {
                target: container,
                props: {
                    variant: "soft",
                    size: "md",
                    multiple: true,
                    files: [makeFile("a.txt", 10), makeFile("b.txt", 20)],
                    item: itemSnippet,
                },
            });
            flushSync();

            const multiRows = container.querySelectorAll<HTMLElement>(
                ":scope ul.cs-upload-area-list .custom-item-row",
            );
            expect(multiRows).toHaveLength(2);
            expect(multiRows[0]?.textContent).toBe("a.txt (#0)");
            expect(multiRows[1]?.textContent).toBe("b.txt (#1)");

            unmount(multiInstance);
        });
    });

    describe("Refs, form sync & rest props", () => {
        test("binds ref and inputRef, forwards rest props/class/name, and syncs DataTransfer inputRef.files on drop and remove", () => {
            let rootRef = $state<HTMLDivElement | null>(null);
            let inputRef = $state<HTMLInputElement | null>(null);
            let files = $state<File[]>([]);

            const instance = mount(UploadArea, {
                target: container,
                props: {
                    variant: "elevated",
                    size: "lg",
                    name: "attachments",
                    class: "custom-upload-class",
                    "data-testid": "upload-root",
                    multiple: true,
                    get ref() {
                        return rootRef;
                    },
                    set ref(next) {
                        rootRef = next;
                    },
                    get inputRef() {
                        return inputRef;
                    },
                    set inputRef(next) {
                        inputRef = next;
                    },
                    get files() {
                        return files;
                    },
                    set files(next) {
                        files = next;
                    },
                },
            });
            flushSync();

            const root = getRoot();
            const input = getInput();

            expect(rootRef).toBe(root);
            expect(inputRef).toBe(input);
            expect(root.classList.contains("cs-upload-area")).toBe(true);
            expect(root.classList.contains("custom-upload-class")).toBe(true);
            expect(root.dataset.testid).toBe("upload-root");
            expect(input.name).toBe("attachments");

            const f1 = makeFile("doc1.pdf", 100, "application/pdf");
            const f2 = makeFile("doc2.pdf", 200, "application/pdf");

            dispatchDragEvent(root, "drop", { files: [f1, f2] });
            expect(files).toEqual([f1, f2]);

            if (typeof DataTransfer !== "undefined" && inputRef) {
                expect(inputRef.files?.length).toBe(2);
                expect(inputRef.files?.[0]?.name).toBe("doc1.pdf");
                expect(inputRef.files?.[1]?.name).toBe("doc2.pdf");
            }

            const removeFirst = container.querySelector<HTMLButtonElement>(
                'button[aria-label="Remove doc1.pdf"]',
            );
            expect(removeFirst).not.toBeNull();
            removeFirst?.click();
            flushSync();

            expect(files).toEqual([f2]);
            if (typeof DataTransfer !== "undefined" && inputRef) {
                expect(inputRef.files?.length).toBe(1);
                expect(inputRef.files?.[0]?.name).toBe("doc2.pdf");
            }

            unmount(instance);
        });
    });

    describe("Cross-interactions & controlled edge cases", () => {
        test("single-file async lifecycle: uploading -> done -> Remove -> back to idle dropzone", () => {
            let items = $state<UploadAreaItem[]>([
                { id: "u1", name: "report.pdf", size: 1024, status: "uploading", progress: 40 },
            ]);
            const onRemove = vi.fn((_item: UploadAreaItem, index: number) => {
                items = items.filter((_, i) => i !== index);
            });

            const instance = mount(UploadArea, {
                target: container,
                props: {
                    variant: "soft",
                    size: "md",
                    multiple: false,
                    get items() {
                        return items;
                    },
                    onRemove,
                },
            });
            flushSync();

            const root = getRoot();
            expect(root.dataset.hasFiles).toBe("");
            expect(getDropzone()).toBeNull();
            expect(root.querySelector(':scope [data-item-status="uploading"]')).not.toBeNull();

            // Transition uploading -> done
            items = [{ id: "u1", name: "report.pdf", size: 1024, status: "done", progress: 100 }];
            flushSync();

            expect(root.querySelector(':scope [data-item-status="done"]')).not.toBeNull();
            const removeBtn = root.querySelector<HTMLButtonElement>(
                'button[aria-label="Remove report.pdf"]',
            );
            expect(removeBtn).not.toBeNull();

            // Remove -> back to idle dropzone
            removeBtn?.click();
            flushSync();

            expect(onRemove).toHaveBeenCalledTimes(1);
            expect(items).toEqual([]);
            expect(root.dataset.status).toBe("idle");
            expect(root.dataset.hasFiles).toBeUndefined();
            expect(getDropzone()).not.toBeNull();

            unmount(instance);
        });

        test("allows re-selecting the exact same file after removal", () => {
            let files = $state<File[]>([]);
            const onFilesChange = vi.fn();

            const instance = mount(UploadArea, {
                target: container,
                props: {
                    variant: "soft",
                    size: "md",
                    get files() {
                        return files;
                    },
                    set files(next) {
                        files = next;
                    },
                    onFilesChange,
                },
            });
            flushSync();

            const sameFile = makeFile("same.png", 256, "image/png");
            const input = getInput();

            // 1. Select file
            selectFilesViaInput(input, [sameFile]);
            expect(files).toEqual([sameFile]);
            expect(input.value).toBe("");
            expect(onFilesChange).toHaveBeenCalledTimes(1);

            // 2. Remove file
            const removeBtn = container.querySelector<HTMLButtonElement>(
                'button[aria-label="Remove same.png"]',
            );
            removeBtn?.click();
            flushSync();
            expect(files).toEqual([]);
            expect(onFilesChange).toHaveBeenCalledTimes(2);

            // 3. Re-select the exact same File instance
            selectFilesViaInput(input, [sameFile]);
            expect(files).toEqual([sameFile]);
            expect(onFilesChange).toHaveBeenCalledTimes(3);
            expect(onFilesChange).toHaveBeenLastCalledWith([sameFile]);

            unmount(instance);
        });

        test("one-way files prop + onFilesChange does not throw on pick, drop, or remove", () => {
            let externalFiles = $state<File[]>([]);
            const onFilesChange = vi.fn((next: File[]) => {
                externalFiles = next;
            });

            const instance = mount(UploadArea, {
                target: container,
                props: {
                    variant: "soft",
                    size: "md",
                    multiple: true,
                    get files() {
                        return externalFiles;
                    },
                    onFilesChange,
                },
            });
            flushSync();

            const f1 = makeFile("picked.txt", 50);
            const f2 = makeFile("dropped.txt", 60);

            expect(() => {
                selectFilesViaInput(getInput(), [f1]);
            }).not.toThrow();
            expect(onFilesChange).toHaveBeenLastCalledWith([f1]);
            expect(externalFiles).toEqual([f1]);

            expect(() => {
                dispatchDragEvent(getRoot(), "drop", { files: [f2] });
            }).not.toThrow();
            expect(onFilesChange).toHaveBeenLastCalledWith([f1, f2]);
            expect(externalFiles).toEqual([f1, f2]);

            const removeFirst = container.querySelector<HTMLButtonElement>(
                'button[aria-label="Remove picked.txt"]',
            );
            expect(() => {
                removeFirst?.click();
                flushSync();
            }).not.toThrow();
            expect(onFilesChange).toHaveBeenLastCalledWith([f2]);
            expect(externalFiles).toEqual([f2]);

            unmount(instance);
        });

        test("maxFiles in controlled items mode respects items.length", () => {
            const onReject = vi.fn();
            const onFilesChange = vi.fn();

            const instance = mount(UploadArea, {
                target: container,
                props: {
                    variant: "soft",
                    size: "md",
                    multiple: true,
                    maxFiles: 2,
                    items: [
                        { id: "1", name: "existing-1.png", status: "done" },
                        { id: "2", name: "existing-2.png", status: "uploading", progress: 50 },
                    ],
                    onReject,
                    onFilesChange,
                },
            });
            flushSync();

            const extra = makeFile("extra.png", 100, "image/png");
            dispatchDragEvent(getRoot(), "drop", { files: [extra] });

            expect(onReject).toHaveBeenCalledTimes(1);
            expect(onReject).toHaveBeenCalledWith([{ file: extra, reason: "count" }]);
            expect(onFilesChange).not.toHaveBeenCalled();
            expect(getErrorEl()?.textContent?.trim()).toBe("Maximum 2 files");

            unmount(instance);
        });
    });

    describe("Additional props & disabled guards", () => {
        test("renders custom label prop when idle and switches to drop prompt while dragging", () => {
            const instance = mount(UploadArea, {
                target: container,
                props: {
                    variant: "soft",
                    size: "md",
                    label: "Upload your invoice",
                },
            });
            flushSync();

            const root = getRoot();
            const title = root.querySelector(":scope .cs-upload-area-title");
            expect(title?.textContent?.trim()).toBe("Upload your invoice");

            dispatchDragEvent(root, "dragenter");
            expect(title?.textContent?.trim()).toBe("Drop to upload");

            dispatchDragEvent(root, "dragleave");
            expect(title?.textContent?.trim()).toBe("Upload your invoice");

            unmount(instance);
        });

        test("disabled blocks openPicker() and handleRemove()", () => {
            let disabled = $state(true);
            let files = $state<File[]>([makeFile("locked.txt", 42)]);
            const onRemove = vi.fn();
            const onFilesChange = vi.fn();

            // 1. Disabled dropzone blocks openPicker()
            const pickerInstance = mount(UploadArea, {
                target: container,
                props: {
                    variant: "soft",
                    size: "md",
                    disabled: true,
                },
            });
            flushSync();

            const inputClickSpy = vi.spyOn(getInput(), "click");
            const dropzone = getDropzone();
            expect(dropzone).not.toBeNull();
            dropzone?.click();
            flushSync();
            expect(inputClickSpy).not.toHaveBeenCalled();

            unmount(pickerInstance);

            // 2. Disabled populated area blocks handleRemove()
            const populatedInstance = mount(UploadArea, {
                target: container,
                props: {
                    variant: "soft",
                    size: "md",
                    get disabled() {
                        return disabled;
                    },
                    get files() {
                        return files;
                    },
                    set files(next) {
                        files = next;
                    },
                    onRemove,
                    onFilesChange,
                },
            });
            flushSync();

            const removeBtn = container.querySelector<HTMLButtonElement>(
                'button[aria-label="Remove locked.txt"]',
            );
            expect(removeBtn).not.toBeNull();
            expect(removeBtn?.disabled).toBe(true);
            removeBtn?.click();
            flushSync();

            expect(files).toHaveLength(1);
            expect(onRemove).not.toHaveBeenCalled();
            expect(onFilesChange).not.toHaveBeenCalled();

            // Re-enabling allows removal
            disabled = false;
            flushSync();
            removeBtn?.click();
            flushSync();
            expect(files).toEqual([]);
            expect(onRemove).toHaveBeenCalledTimes(1);
            expect(onFilesChange).toHaveBeenCalledWith([]);

            unmount(populatedInstance);
        });
    });
});
