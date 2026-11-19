# UploadArea Module Blueprint

## 1. Overview & Scope

- **Kind:** `component` (single focused component with optional snippet customization)
- **Purpose:** A clean, borderless-by-default drag-and-drop and click-to-browse file upload area with built-in client-side validation (`accept`, `maxSize`, `maxFiles`), single/multi-file list rendering, and optional upload progress/error/retry integration.
- **Boundaries:**
  - Owns native `<input type="file">` orchestration, drag-and-drop state (`data-dragging` without child-hover flicker), client-side file validation and rejection reporting, and optional file/upload item list rendering.
  - Composes `Button` + `HitArea` (for compact remove/cancel/retry row actions) and `Progress` (rendered *only* when an item is actively uploading, collapsing cleanly via CSS grid-row transition when complete).
  - **Does not** implement network transport (`fetch`/`XHR`), chunking, image cropping, or multi-part compound subcomponents (`UploadAreaRoot`/`UploadAreaDropzone`/`UploadAreaList`).

---

## 2. Public API

### Exports (`src/modules/upload-area/index.ts`)

**Component:**
- `UploadArea` — Focused dropzone + optional file/upload list component.

**Constants & Types:**
- `UPLOAD_AREA_VARIANTS = ["soft", "elevated", "sunken"] as const` -> `UploadAreaVariant`
- `UPLOAD_AREA_SIZES = ["sm", "md", "lg"] as const` -> `UploadAreaSize`
- `UploadAreaStatus = "idle" | "uploading" | "done" | "error"`
- `UploadAreaRejectionReason = "type" | "size" | "count"`
- `UploadAreaRejection = { file: File; reason: UploadAreaRejectionReason }`
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

### Component Props (`UploadArea`)

`Omit<HTMLAttributes<HTMLDivElement>, "children">`

**Required Visual Props (no defaults):**
- `variant: UploadAreaVariant` — `"soft" | "elevated" | "sunken"`
- `size: UploadAreaSize` — `"sm" | "md" | "lg"`

**File & Upload State:**
- `files = $bindable<File[]>([])` — Bound list of accepted `File` objects (in `multiple = false` mode, holds `0` or `1` file).
- `onFilesChange?: (files: File[]) => void` — Called whenever `files` changes via drop, file picker, or built-in removal.
- `items?: UploadAreaItem[]` — Optional controlled upload item list for async/server uploads. When omitted, `UploadArea` derives display rows directly from `files` with no progress bar. When provided, `UploadArea` renders `items` and shows `<Progress>` only for items with `status === "uploading"` (or `status === "error"` before collapse).
- `onReject?: (rejections: UploadAreaRejection[]) => void` — Called when dropped or picked files fail `accept`, `maxSize`, or `maxFiles` validation.
- `onRemove?: (item: UploadAreaItem, index: number) => void` — Called when the user removes a file/item. When `items` is omitted, `UploadArea` also removes the corresponding entry from `files` automatically.
- `onCancel?: (item: UploadAreaItem, index: number) => void` — When provided, renders a `Cancel` action on items with `status === "uploading"`.
- `onRetry?: (item: UploadAreaItem, index: number) => void` — When provided, renders a `Retry` action on items with `status === "error"`.

**Validation & Native Input Constraints:**
- `accept?: string` — Standard HTML `accept` filter (MIME types, wildcards like `image/*`, or extensions like `.pdf`). Enforced on both `<input type="file">` and drag-and-drop.
- `multiple?: boolean` — `@default false`. When `false`, selecting/dropping a valid file replaces the current file. When `true`, valid files append up to `maxFiles`.
- `maxSize?: number` — Maximum file size in bytes.
- `maxFiles?: number` — Maximum total files allowed when `multiple` is `true`.

**Copy & Customization:**
- `label?: string` — Primary dropzone prompt (falls back to localized `"Drop files here or browse"` / `"Dateien hierher ziehen oder auswählen"` via `src/shared/lang.internal.ts`).
- `description?: string` — Optional secondary hint (e.g. `"PDF, PNG up to 5 MB"`).
- `error?: string` — Optional consumer-controlled error message (overrides internal validation message when set).
- `children?: Snippet<[{ dragging: boolean; disabled: boolean }]>` — Optional custom dropzone body replacing the default icon, `label`, and `description`.
- `item?: Snippet<[UploadAreaItem, number]>` — Optional custom file row renderer.

**Form, Accessibility & Element Binding:**
- `ref = $bindable<HTMLDivElement | null>(null)` — Root `.cs-upload-area` element.
- `inputRef = $bindable<HTMLInputElement | null>(null)` — Underlying `<input type="file">` element.
- `name?: string` — Forwarded to `<input type="file" {name}>` for native form submission.
- `id?: string` — Base ID for ARIA wiring (falls back to `$props.id()`).
- `disabled?: boolean` — `@default false`.
- `invalid?: boolean` — `@default false`. Also becomes visually/semantically invalid while an active `error` or internal validation error is present.

### CSS Variables (`--cs-upload-area-*`)

- **Surface & Ring:**
  - `--cs-upload-area-bg`, `--cs-upload-area-bg-hover`, `--cs-upload-area-bg-dragging`
  - `--cs-upload-area-fg`, `--cs-upload-area-description-fg`, `--cs-upload-area-icon-fg`
  - `--cs-upload-area-shadow`, `--cs-upload-area-shadow-hover`
  - `--cs-upload-area-ring-shadow`, `--cs-upload-area-ring-shadow-hover`
- **Geometry & Typography:**
  - `--cs-upload-area-min-height`
  - `--cs-upload-area-px`, `--cs-upload-area-py`, `--cs-upload-area-gap`
  - `--cs-upload-area-radius`, `--cs-upload-area-squircle`
  - `--cs-upload-area-icon-size`, `--cs-upload-area-font-size`, `--cs-upload-area-description-size`
- **File List:**
  - `--cs-upload-area-list-gap`, `--cs-upload-area-item-py`, `--cs-upload-area-item-gap`

---

## 3. DOM, Semantics & Accessibility

### Native Elements & `data-*` Selectors

```html
<div
    class="cs-upload-area"
    data-variant={variant}
    data-size={size}
    data-dragging={dragging ? "" : undefined}
    data-disabled={disabled ? "" : undefined}
    data-invalid={isInvalid ? "" : undefined}
    data-has-files={displayItems.length > 0 ? "" : undefined}
>
    <input
        class="cs-upload-area-input"
        type="file"
        tabindex={-1}
        aria-hidden="true"
        {name}
        {accept}
        {multiple}
        {disabled}
    />

    <button
        type="button"
        class="cs-upload-area-dropzone"
        {disabled}
        aria-describedby={describedById}
    >
        <!-- Default icon + label + description, or custom children snippet -->
    </button>

    <!-- Live error/status region (role="status", aria-live="polite") -->
    <!-- Sibling <ul> file list (never nested inside <button>) -->
</div>
```

### Accessibility & Interaction Rules
- **No Nested Interactive Elements:** The dropzone trigger is a native `<button type="button">` and the file list is a sibling `<ul>` outside the `<button>`, so row action buttons (`Remove`, `Cancel`, `Retry`) never nest inside another `<button>`.
- **Visually Hidden `<input type="file">`:** Uses `.cs-upload-area-input` (`position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%);`) rather than `display: none` so programmatic `.click()` and native form submission work reliably across browsers.
- **Keyboard Activation:** Native `<button type="button">` handles `Enter` and `Space` to open the OS file picker; `Shift`/`Tab` moves cleanly between the dropzone `<button>` and row action `<Button>`s.
- **Drag-and-Drop Flicker Prevention:** Track `dragDepth` (increment on `dragenter`, decrement on `dragleave`, reset to `0` on `drop` and `dragend`) so moving the pointer across child nodes (`<svg>`, `<span>`) never toggles `data-dragging` off prematurely.
- **Validation & Live Announcements:**
  - `data-invalid` marks the root `.cs-upload-area` (`aria-invalid` is omitted on `<button>` because `svelte-check` disallows `aria-invalid` on native buttons), while `aria-describedby` links the dropzone `<button>` to the description and/or active error message.
  - A `role="status"` / `aria-live="polite"` status region announces validation rejections and upload state changes without stealing focus.
- **Single vs. Multiple File UX:**
  - When `multiple = false` and a file is present, the dropzone remains active for click/drop replacement (with concise copy or the selected file row rendered cleanly below it) and offers a single `Remove` button (`X` with `HitArea`).
  - When `multiple = true`, the dropzone stays available until `files.length >= maxFiles` (at which point dropping/adding beyond `maxFiles` triggers `onReject` with `reason: "count"`).

---

## 4. Visual & Motion Contract

### Surface & Elevation (`variant`)
- **`soft`:** `var(--cs-color-base-soft)` fill, `var(--cs-color-base-soft-hover)` on hover, subtle dashed inset outline/border cue (`1.5px dashed`) using `--cs-color-base-active` / `--cs-color-text-weaker` at low contrast—ideal on `canvas` or inside an `elevated` `Card`.
- **`elevated`:** `var(--cs-color-elevated)` fill + `var(--cs-shadow-elevated)` (`--cs-shadow-elevated-hover` on hover)—standalone surface on `canvas`.
- **`sunken`:** `var(--cs-color-sunken)` fill + `var(--cs-shadow-sunken)`—recessed well ideal inside an `elevated` `Card` or modal.
- **Interactive Rings:**
  - Focus (`:focus-visible`): `inset 0 0 0 2px var(--cs-color-accent-solid)` (relying on `box-shadow` compositing order so focus ring paints above elevation shadow, matching `TextArea`).
  - Dragging (`[data-dragging]`): `--cs-color-accent-soft` background tint + `inset 0 0 0 2px var(--cs-color-accent-solid)`.
  - Invalid (`[data-invalid]`): `inset 0 0 0 2px var(--cs-color-negative-solid)` + negative error text (`--cs-color-negative-soft-fg`).
  - Disabled (`[data-disabled]`): colorless `--cs-color-disabled-bg` / `--cs-color-disabled-bg-elevated` and `--cs-color-disabled-fg` (`--cs-disabled-opacity: 1`).

### Proportional `size` Scale (`sm..lg`)
Aligned with `TextArea` (`sm..lg`) and `Card` (`sm..lg`):
- **`sm`:** `min-height: 96px`, `px: 14px`, `py: 12px`, `radius: 12px`, `squircle: var(--cs-squircle-smooth)`, `icon: 18px`, `font-size: var(--cs-text-xs)`.
- **`md`:** `min-height: 136px`, `px: 20px`, `py: 18px`, `radius: 16px`, `squircle: var(--cs-squircle)`, `icon: 22px`, `font-size: var(--cs-text-sm)`.
- **`lg`:** `min-height: 176px`, `px: 28px`, `py: 24px`, `radius: 20px`, `squircle: var(--cs-squircle)`, `icon: 26px`, `font-size: var(--cs-text-sm)` (title `var(--cs-text-base)`).

### Optional Progress & Motion
- **Optional Progress:** `<Progress appearance="bar" variant="soft" size="sm" color={item.status === "error" ? "negative" : "accent"} />` is wrapped in a CSS `grid-template-rows: 0fr -> 1fr` collapse container (matching `src/references/05-upload-item/UploadItem.svelte`), using `--cs-dur-enter-sm` / `--cs-ease-enter` on open and `--cs-dur-exit-sm` / `--cs-ease-exit` on collapse. When `items` is not used or `status === "done"`, the progress track collapses away cleanly.
- **Surface Transitions:** Background, box-shadow, and icon color transitions use `--cs-dur-effect` (`--cs-ease-effect`) and `--cs-dur-120` (`--cs-ease-quart-out`).
- **Tactile Row Actions:** Remove (`X`), `Cancel`, and `Retry` buttons use `Button` (`size="xs"`, `variant="ghost"` / `"tertiary"`) with `<HitArea size="md" />` so compact controls stay comfortably above the `1936px²` hit-area threshold.

---

## 5. Edge Cases & Constraints

- **Drag-and-Drop vs. Input Sync:** Dropping files does not automatically populate `inputRef.files` in all contexts; `UploadArea` treats `files` state as the source of truth and syncs `DataTransfer` to `inputRef.files` on a best-effort basis when `name` is set for native `<form>` submission. Reset `inputRef.value = ""` after handling `onchange` so re-selecting the same file after removal still fires `change`.
- **`accept` Validation Parity:** Native `<input accept>` only filters the OS picker dialog (and users can still bypass it or drag-and-drop arbitrary files). `UploadArea` must validate dropped files against `accept` (supporting MIME wildcards like `image/*`, exact MIME types, and `.ext` suffixes case-insensitively).
- **Zero Cross-Module Internal Imports:** `UploadArea` may import public exports from `../button/index.ts`, `../hit-area/index.ts`, and `../progress/index.ts`, plus `../../shared/lang.internal.ts` for localized defaults, but must never import `*.internal.*` from sibling modules.
- **Explicit Non-Goals:**
  - No built-in image/video thumbnail preview generator (consumers can use the `item` snippet if needed).
  - No built-in `XHR`/`fetch` uploader or retry scheduler.
  - No `xs`/`xl` sizes (dropzones below `sm` or above `lg` are better served by a plain `<Button>` trigger or custom layout).
