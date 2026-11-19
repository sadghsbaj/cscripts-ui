---
name: UploadArea
kind: component
import: cs/svelte/upload-area
exports:
    - UploadArea
    - UPLOAD_AREA_VARIANTS
    - UPLOAD_AREA_SIZES
    - UploadAreaVariant
    - UploadAreaSize
    - UploadAreaStatus
    - UploadAreaRejectionReason
    - UploadAreaRejection
    - UploadAreaItem
    - UploadAreaProps
---

# UploadArea

## Overview

Drag-and-drop and click-to-browse file upload surface with built-in client-side validation (`accept`, `maxSize`, `maxFiles`), single- and multi-file row rendering, and optional controlled async upload state (`uploading`, `done`, `error`, `Cancel`, `Retry`, `Remove`).

## Usage Guidance

- **`soft`**: Universal default for forms, modals, `elevated` `Card` containers, or directly on `--cs-color-canvas`.
- **`sunken`**: Recessed drop tray for placement inside an `elevated` `Card` or modal. Avoid placing `sunken` directly on `--cs-color-canvas`.
- **`elevated`**: Standalone dropzone placed directly on `--cs-color-canvas`. Do not nest `elevated` inside an `elevated` `Card`.

## API

### `UploadArea` Props

Extends `Omit<HTMLAttributes<HTMLDivElement>, "children">`.

| Prop | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `variant` | `UploadAreaVariant` | Yes | — | Surface treatment: `"soft" \| "elevated" \| "sunken"`. |
| `size` | `UploadAreaSize` | Yes | — | T-shirt scale: `"sm" \| "md" \| "lg"` (compact stacked `104px`, balanced `140px`, spacious `184px` minimum height). |
| `files` | `File[]` | No | `[]` | `$bindable` list of accepted `File` objects. Holds `0` or `1` file when `multiple` is `false`. |
| `onFilesChange` | `(files: File[]) => void` | No | `undefined` | Fires when `files` changes via drop, file picker, or built-in removal. |
| `items` | `UploadAreaItem[]` | No | `undefined` | Controlled upload items for async progress, completion, and error recovery. When omitted, rows are derived from `files`. |
| `onReject` | `(rejections: UploadAreaRejection[]) => void` | No | `undefined` | Fires when picked or dropped files fail `accept`, `maxSize`, or `maxFiles` validation. |
| `onRemove` | `(item: UploadAreaItem, index: number) => void` | No | `undefined` | Fires when removing an item. When `items` is omitted, `UploadArea` also removes the entry from `files`. |
| `onCancel` | `(item: UploadAreaItem, index: number) => void` | No | `undefined` | When provided, renders a `Cancel` action on items with `status === "uploading"`. |
| `onRetry` | `(item: UploadAreaItem, index: number) => void` | No | `undefined` | When provided, renders a `Retry` action on items with `status === "error"`. |
| `accept` | `string` | No | `undefined` | Comma-separated MIME types, wildcards (`image/*`), or extensions (`.pdf`). Enforced on both `<input>` and drag-and-drop. |
| `multiple` | `boolean` | No | `false` | Allows multiple files and renders a sibling `<ul>` file list below the dropzone. |
| `maxSize` | `number` | No | `undefined` | Maximum file size in bytes. |
| `maxFiles` | `number` | No | `undefined` | Maximum total files allowed when `multiple` is `true`. |
| `label` | `string` | No | `undefined` | Custom primary dropzone prompt (falls back to localized `"Drop file or browse"` or `"Drop files or browse"` when `multiple`). |
| `description` | `string` | No | `undefined` | Secondary constraint or helper line below the primary prompt. |
| `error` | `string` | No | `undefined` | Consumer-controlled error message. Overrides internal validation error messages when set. |
| `children` | `Snippet<[{ dragging: boolean; disabled: boolean }]>` | No | `undefined` | Custom dropzone body replacing the default icon, `label`, and `description`. |
| `item` | `Snippet<[UploadAreaItem, number]>` | No | `undefined` | Custom renderer for populated single-file and multi-file rows. |
| `ref` | `HTMLDivElement \| null` | No | `null` | `$bindable` reference to the root `.cs-upload-area` element. |
| `inputRef` | `HTMLInputElement \| null` | No | `null` | `$bindable` reference to the underlying `<input type="file">` element. |
| `name` | `string` | No | `undefined` | Forwarded to `<input type="file">` for native form submission. |
| `id` | `string` | No | `$props.id()` | Base ID used for root element and `aria-describedby` wiring. |
| `disabled` | `boolean` | No | `false` | Disables picker, drag-and-drop, and row actions. |
| `invalid` | `boolean` | No | `false` | Marks the surface invalid (`data-invalid`). Also active automatically when `error`, validation errors, or single-file `status === "error"` are present. |
| `class` | `ClassValue` | No | `undefined` | Additional class names merged onto `.cs-upload-area`. |

### Exported Constants & Types

- `UPLOAD_AREA_VARIANTS`: `readonly ["soft", "elevated", "sunken"]` (`UploadAreaVariant`)
- `UPLOAD_AREA_SIZES`: `readonly ["sm", "md", "lg"]` (`UploadAreaSize`)
- `UploadAreaStatus`: `"idle" | "uploading" | "done" | "error"`
- `UploadAreaRejectionReason`: `"type" | "size" | "count"`
- `UploadAreaRejection`: `{ file: File; reason: UploadAreaRejectionReason }`
- `UploadAreaItem`:
  ```ts
  export interface UploadAreaItem {
      id: string;
      file?: File;
      name: string;
      size?: number;
      sizeLabel?: string;
      status?: UploadAreaStatus;
      progress?: number;
      error?: string;
  }
  ```
- `UploadAreaProps`

### `data-*` Attributes

- **Root (`.cs-upload-area`):**
  - `data-variant`: `"soft" | "elevated" | "sunken"`
  - `data-size`: `"sm" | "md" | "lg"`
  - `data-status`: `"idle" | "uploading" | "done" | "error"` (tracks `singleItem.status` in single-file mode; `"idle"` otherwise)
  - `data-dragging`: present while dragging files over the surface (when not `disabled`)
  - `data-disabled`: present when `disabled` is `true`
  - `data-invalid`: present when `invalid`, an active error message, or single-file `status === "error"` is active
  - `data-has-files`: present when one or more files/items are displayed
  - `data-nested`: present when nested inside a parent surface (`Card`, `KpiCard`) via `createSurfaceRadius`
- **Rows (`.cs-upload-area-single`, `.cs-upload-area-item`):**
  - `data-item-status`: `"idle" | "uploading" | "done" | "error"`

### CSS Custom Properties

Overridable on `.cs-upload-area`:

| Variable | Default | Description |
| :--- | :--- | :--- |
| `--cs-upload-area-bg` | Variant token (`--cs-color-base-soft` / `--cs-color-elevated` / `--cs-color-sunken`) | Surface background color. |
| `--cs-upload-area-bg-hover` | Variant hover token | Surface hover background color. |
| `--cs-upload-area-bg-dragging` | `var(--cs-color-accent-soft)` | Background color while dragging files over the dropzone. |
| `--cs-upload-area-fg` | `var(--cs-color-text-strong)` | Primary prompt text color. |
| `--cs-upload-area-description-fg` | `var(--cs-color-text-weak)` | Secondary description text color. |
| `--cs-upload-area-icon-fg` | `var(--cs-color-text-weak)` | Idle upload icon color. |
| `--cs-upload-area-shadow` | `0 0 #0000` (`soft`) / `var(--cs-shadow-elevated)` / `var(--cs-shadow-sunken)` | Surface box-shadow. |
| `--cs-upload-area-shadow-hover` | `var(--cs-upload-area-shadow)` (`var(--cs-shadow-elevated-hover)` for `elevated`) | Hover surface box-shadow. |
| `--cs-upload-area-ring-shadow` | `inset 0 0 0 0px transparent` | Inset focus, dragging, and invalid ring shadow on `::after`. |
| `--cs-upload-area-min-height` | `104px` (`sm`) / `140px` (`md`) / `184px` (`lg`) | Minimum surface height. |
| `--cs-upload-area-py` | `18px` (`sm`) / `24px` (`md`) / `32px` (`lg`) | Vertical dropzone padding. |
| `--cs-upload-area-px` | `18px` (`sm`) / `24px` (`md`) / `32px` (`lg`) | Horizontal dropzone padding. |
| `--cs-upload-area-gap` | `8px` (`sm`) / `12px` (`md`) / `14px` (`lg`) | Gap between icon and copy block. |
| `--cs-upload-area-copy-gap` | `2px` (`sm`) / `4px` (`md`, `lg`) | Gap between primary prompt and description. |
| `--cs-upload-area-radius` | `var(--cs-radius-2xl)` (`sm`) / `var(--cs-radius-3xl)` (`md`) / `28px` (`lg`) | Corner radius (automatically overridden by `--cs-upload-area-nested-radius` when `[data-nested]`). |
| `--cs-upload-area-squircle` | `var(--cs-squircle)` (`var(--cs-squircle-smooth)` when `[data-nested]`) | Squircle `corner-shape` value. |
| `--cs-upload-area-icon-size` | `18px` (`sm`) / `22px` (`md`) / `26px` (`lg`) | Upload icon dimensions. |
| `--cs-upload-area-font-size` | `var(--cs-text-sm)` (`sm`, `md`) / `var(--cs-text-base)` (`lg`) | Primary prompt font size. |
| `--cs-upload-area-title-lh` | `20px` (`sm`, `md`) / `22px` (`lg`) | Primary prompt line height. |
| `--cs-upload-area-title-tracking` | `-0.006em` (`sm`, `md`) / `-0.011em` (`lg`) | Primary prompt letter spacing. |
| `--cs-upload-area-description-size` | `var(--cs-text-xs)` (`sm`, `md`, `lg`) | Description font size. |
| `--cs-upload-area-description-lh` | `16px` (`sm`, `md`, `lg`) | Description line height. |
| `--cs-upload-area-list-gap` | `10px` | Gap between surface, error message, and file list. |
| `--cs-upload-area-item-py` | `10px` | Vertical padding for multi-file list rows. |
| `--cs-upload-area-item-gap` | `4px` | Internal item spacing token. |

## Examples

### Simple `bind:files`

```svelte
<script lang="ts">
    import { UploadArea } from "cs/svelte/upload-area";

    let files = $state<File[]>([]);
</script>

<UploadArea
    variant="soft"
    size="md"
    bind:files
    accept="image/*,.pdf"
    maxSize={5 * 1024 * 1024}
    description="PNG, JPG, or PDF · max 5 MB"
/>
```

### Nested `sunken` inside an `elevated` `Card`

```svelte
<script lang="ts">
    import { Card, CardBody, CardDescription, CardHeader, CardTitle } from "cs/svelte/card";
    import { UploadArea } from "cs/svelte/upload-area";

    let assets = $state<File[]>([]);
</script>

<Card variant="elevated" size="md">
    <CardHeader>
        <CardTitle>Project Assets</CardTitle>
        <CardDescription>Upload design tokens or brand artwork.</CardDescription>
    </CardHeader>
    <CardBody>
        <UploadArea
            variant="sunken"
            size="md"
            multiple
            maxFiles={4}
            bind:files={assets}
            description="Up to 4 files"
        />
    </CardBody>
</Card>
```

### Controlled Async `items`

```svelte
<script lang="ts">
    import { UploadArea, type UploadAreaItem } from "cs/svelte/upload-area";

    let items = $state<UploadAreaItem[]>([
        { id: "1", name: "deck.pdf", size: 2_400_000, status: "uploading", progress: 64 },
        { id: "2", name: "video.mp4", size: 8_100_000, status: "error", progress: 40, error: "Upload failed" },
    ]);

    function handleFilesChange(nextFiles: File[]): void {
        const added: UploadAreaItem[] = nextFiles.map((file) => ({
            id: crypto.randomUUID(),
            file,
            name: file.name,
            size: file.size,
            status: "uploading",
            progress: 0,
        }));
        items = [...items, ...added];
    }

    function handleCancel(item: UploadAreaItem): void {
        items = items.filter((entry) => entry.id !== item.id);
    }

    function handleRetry(item: UploadAreaItem): void {
        items = items.map((entry) =>
            entry.id === item.id ? { ...entry, status: "uploading", progress: 0, error: undefined } : entry
        );
    }

    function handleRemove(item: UploadAreaItem): void {
        items = items.filter((entry) => entry.id !== item.id);
    }
</script>

<UploadArea
    variant="soft"
    size="md"
    multiple
    files={[]}
    {items}
    onFilesChange={handleFilesChange}
    onCancel={handleCancel}
    onRetry={handleRetry}
    onRemove={handleRemove}
/>
```

## Behavior & Quirks

- **Centered Stacked Dropzone & Copy:** All sizes (`sm`, `md`, `lg`) render a centered vertical stack (`104px` / `140px` / `184px` minimum height) with default localized copy (`"Drop file or browse"` / `"Drop files or browse"`, switching to `"Drop to upload"` while dragging).
- **Single-file vs. Multi-file Rendering:** When `multiple` is `false` and a file/item is present, the dropzone switches to an inline populated status row (`.cs-upload-area-single`). When `multiple` is `true`, the dropzone stays visible for additional drops/picks and renders a sibling `<ul class="cs-upload-area-list">` below it.
- **Controlled `items` Removal:** In `items` mode, the remove (`X`) button is rendered only when `onRemove` is provided; `UploadArea` does not mutate `items` directly.
- **Drag Flicker Prevention:** `dragDepth` tracks nested `dragenter` / `dragleave` events and resets on `drop` and `dragend`, preventing `data-dragging` from flickering when moving over child elements.
- **Form Submission Sync:** When `name` is set, accepted files are synced to `inputRef.files` via `DataTransfer` on a best-effort basis, and `inputRef.value` is cleared after `change` so re-selecting the same file after removal still triggers `change`.
- **No Nested Interactive Elements:** The dropzone trigger is a native `<button type="button">` and the multi-file list is a sibling `<ul>`, ensuring row actions (`Cancel`, `Retry`, `Remove`) never nest inside another `<button>`.
