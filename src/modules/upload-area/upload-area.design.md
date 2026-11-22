# UploadArea Design Spec (`src/modules/upload-area/`)

## 1. Visual Direction & "Ultra-Clean" Craft

`UploadArea` is a focused, tactile file drop and picker surface in `@layer components.composite`. It is designed to feel calm, architectural, and effortless—never a loud dashed utility box or a bloated multi-card widget.

### Core Design Principles

1. **Surface Contrast Over Dashed Borders:**
   - Separate the drop target from its surroundings via `cscripts-ui` surface hierarchy (`soft`, `sunken`, `elevated`), squircle geometry, and hover physics—not a permanent `2px dashed` border.
   - Eliminating dashed borders avoids uneven dash spacing around `corner-shape: squircle` curves and keeps forms visually quiet at rest.
2. **Zero Nested-Box Clutter:**
   - No decorative icon-inside-circle-inside-card nesting. A single crisp Lucide icon (`20px–28px`), a short primary line, and a short constraint line carry the entire idle state.
3. **Zero Layout Jump Across States:**
   - Hover, drag-over, uploading, confirmation, and error states transition in place using `::after` inset rings, `TextMorph`, and `0fr → 1fr` grid reveals—never shifting surrounding form fields.
4. **System DNA:**
   - Monochrome `base` surfaces paired with `accent` for active drag-over and upload progress, `positive` for completed confirmation, and `negative` for validation/upload errors (omitting `caution` and `info`).
   - Direct `px` metrics, `--cs-upload-area-*` CSS custom properties, `cursor: default` on the drop surface, and `motion.css` semantic timings.

---

## 2. Surface Variants (`variant`) & Border vs. Surface Evaluation

`variant` is a **required prop** (`"soft" | "sunken" | "elevated"`), calibrated for where `UploadArea` sits in the layout:

| Variant | `--cs-upload-area-bg` | `--cs-upload-area-shadow` | Hover Feedback | Best Placement |
| :--- | :--- | :--- | :--- | :--- |
| `soft` *(Recommended Default)* | `var(--cs-color-base-soft)` | `none` | `--cs-color-base-soft-hover` | Versatile everywhere: inside an `elevated` `Card`, modals, forms, or directly on `--cs-color-canvas`. |
| `sunken` | `var(--cs-color-sunken)` | `var(--cs-shadow-sunken)` | Subtle brighten (`color-mix` +1.5% / `base-900` in dark) + icon tint to `--cs-color-text-strong` | Recessed "drop tray" **inside** an `elevated` `Card` (`white` / `base-900`). |
| `elevated` | `var(--cs-color-elevated)` | `var(--cs-shadow-elevated)` | `--cs-color-elevated-hover` + `--cs-shadow-elevated-hover` | Standalone dropzone **directly on `--cs-color-canvas`** (never inside an `elevated` `Card`). |

### Why This Hierarchy Works (and What to Avoid)

- **`soft` wins as the universal workhorse:** On a white/`base-900` `Card`, `--cs-color-base-soft` creates an immediately legible, whisper-light zone without shadow competition. On `--cs-color-canvas`, it reads as a calm, distinct interactive pad.
- **`sunken` is tactile inside `Card`, weak on `canvas`:** Because `--cs-color-sunken` shares the same base color tokens as `--cs-color-canvas` (`base-100` / `base-950`), `sunken` on `canvas` relies solely on its inset shadow. Inside an `elevated` `Card`, however, `sunken` gives both tonal contrast and physical tray depth—making "drop files here" feel literal.
- **`elevated` is strictly for standalone `canvas` placement:** Nesting an `elevated` `UploadArea` inside an `elevated` `Card` creates redundant white-on-white (or double-rimmed dark mode) layering. Document and enforce the pairing rule: `canvas` → `elevated` or `soft`; `elevated` `Card` → `soft` or `sunken`.
- **Why no dashed border at rest:** Beyond `design-and-tokens.md`'s borderless-by-default rule, `border-style: dashed` produces inconsistent dash lengths and corner artifacts on `corner-shape: squircle`. Instead, active drag-over (`[data-dragging]`) uses a `::after` overlay (`inset: 0; border-radius: inherit; corner-shape: inherit; pointer-events: none;`) with `box-shadow: inset 0 0 0 2px var(--cs-color-accent-solid)`—100% squircle-accurate and zero box-model shift.

---

## 3. Size Scale, Proportions & Concentric Nesting (`sm` – `lg`)

`size` is a **required prop** (`"sm" | "md" | "lg"`), matching `Card` and `SurfaceSize` so `UploadArea` participates in `createSurfaceRadius` concentric nesting (`[data-nested]`):

| Token / Metric | `sm` *(Compact Stacked)* | `md` *(Balanced Default)* | `lg` *(Spacious / Standalone)* |
| :--- | :--- | :--- | :--- |
| Dropzone layout | `column` (stacked, centered) | `column` (stacked, centered) | `column` (stacked, centered) |
| `--cs-upload-area-min-height` | `104px` | `140px` | `184px` |
| `--cs-upload-area-py` | `18px` | `24px` | `32px` |
| `--cs-upload-area-px` | `18px` | `24px` | `32px` |
| `--cs-upload-area-gap` *(icon → copy)* | `8px` | `12px` | `14px` |
| `--cs-upload-area-copy-gap` *(title → hint)* | `2px` | `4px` | `4px` |
| `--cs-upload-area-radius` *(standalone)* | `var(--cs-radius-2xl)` (`16px`) | `var(--cs-radius-3xl)` (`24px`) | `28px` |
| `--cs-upload-area-squircle` *(standalone)* | `var(--cs-squircle)` | `var(--cs-squircle)` | `var(--cs-squircle)` |
| `--cs-upload-area-icon-size` | `18px` (`strokeWidth: 2`) | `22px` (`strokeWidth: 1.75`) | `26px` (`strokeWidth: 1.75`) |
| `--cs-upload-area-font-size` *(title)* | `var(--cs-text-sm)` (`14px`) | `var(--cs-text-sm)` (`14px`) | `var(--cs-text-base)` (`16px`) |
| `--cs-upload-area-title-lh` | `20px` | `20px` | `22px` |
| `--cs-upload-area-title-tracking` | `-0.006em` | `-0.006em` | `-0.011em` |
| `--cs-upload-area-description-size` | `var(--cs-text-xs)` (`12px`) | `var(--cs-text-xs)` (`12px`) | `var(--cs-text-xs)` (`12px`) |
| `--cs-upload-area-description-lh` | `16px` | `16px` | `16px` |
| Paired `Progress` `size` | `xs` (`4px`) | `sm` (`6px`) | `sm` (`6px`) |
| Paired action `Button` `size` | `xs` | `xs` | `sm` |

### Concentric Nesting (`[data-nested]`)

- When placed inside a `Card` or `KpiCard`, `createSurfaceRadius(() => size)` sets `data-nested=""` and `--cs-upload-area-nested-radius` (`8px`–`12px`), stepping `corner-shape` down to `var(--cs-squircle-smooth)` (`1.6`).

### Optical Alignment & Inner Layout Rhythm

- **Centered Stacked Layout (`sm` / `md` / `lg`):**
  - All sizes stack vertically (`flex-direction: column; align-items: center; justify-content: center; text-align: center`) with `.cs-upload-area-copy` constrained to `max-width: min(36ch, 100%)` so long descriptions wrap into a balanced measure rather than spanning edge-to-edge.
  - `sm` keeps a compact stacked footprint (`min-height: 104px`, `py: 18px`, `px: 18px`, `gap: 8px`, `copy-gap: 2px`) with an `18px` icon centered above the text, while `md` (`140px`) and `lg` (`184px`) open up vertical breathing room.
- **Gestalt Grouping:** Keeping `--cs-upload-area-copy-gap` tight (`2px` at `sm`, `4px` at `md`/`lg`) while separating the icon by `--cs-upload-area-gap` (`8px`–`14px`) clearly groups the title and hint into one typographic unit.
- **Bare Icon Calibration:** Use a single Lucide `Upload` icon (`strokeWidth: 1.75` at `md`/`lg` so `22px`–`26px` stays crisp and architectural; `2` at `sm` for `18px` legibility) in `--cs-color-text-weak` at rest → `--cs-color-text-strong` on hover → `--cs-color-accent-soft-fg` on `[data-dragging]`.

---

## 4. Short Copy & Information Hierarchy

Keep copy calm, monochrome, and scannable at a glance—with zero fake hyperlink blue spans, zero technical jargon, and no hyphens/dashes as separators:

- **Primary line (`.cs-upload-area-title`):**
  - Idle: `"Drop file or browse"` / `"Datei ablegen oder auswählen"` (or `"Drop files or browse"` / `"Dateien ablegen oder auswählen"` when `multiple`).
  - Styling: `font-weight: 500`, `letter-spacing: var(--cs-upload-area-title-tracking)`, uniform `color: var(--cs-upload-area-fg)` (`var(--cs-color-text-strong)`). **No inline `.cs-upload-area-browse` accent-blue span**—the entire dropzone surface is the interactive button and communicates clickability through its hover surface shift.
- **Secondary line (`.cs-upload-area-hint`):**
  - Idle: `"PDF, PNG · max 10 MB"` (middots `·`, never hyphens `-` or parentheses).
  - Styling: `font-weight: 400`, `color: var(--cs-upload-area-description-fg)` (`var(--cs-color-text-weak)`), `font-variant-numeric: tabular-nums`.
- **Drag-over copy shift (zero layout jump):**
  - On `[data-dragging]`, primary copy swaps to `"Drop to upload"` / `"Zum Hochladen ablegen"` (single line, identical `line-height` and `font-size`) in `--cs-color-accent-soft-fg`, while `.cs-upload-area-hint` stays visible at `opacity: 0.75` so the dropzone height never twitches by a single pixel.

---

## 5. DOM Anatomy & Interactive Model

```text
.cs-upload-area (div, data-variant, data-size, data-status="idle"|"uploading"|"done"|"error",
                 data-dragging, data-invalid, data-disabled, data-nested)
├── input[type="file"].cs-upload-area-input (visually hidden, full keyboard/AT semantics, or triggered via <label>)
├── .cs-upload-area-dropzone (clickable <label> for input; flex-col items-center justify-center)
│   ├── .cs-upload-area-icon (Lucide Upload / Check / AlertCircle)
│   ├── .cs-upload-area-copy
│   │   ├── .cs-upload-area-title
│   │   └── [optional] .cs-upload-area-hint
│   └── [when status="uploading" or status="error"] .cs-upload-area-progress (0fr -> 1fr grid reveal)
│       └── <Progress appearance="bar" variant="soft" />
├── [when single-file status="done"|"uploading"|"error"] .cs-upload-area-status-bar (compact file row + action)
└── [when multiple && files.length > 0] .cs-upload-area-list (compact divide-y file rows below dropzone)
```

- **Single focusable target:** When idle, the entire `.cs-upload-area-dropzone` (`<label>`) acts as one unified hit target (`cursor: default`), with `:focus-visible` handled cleanly by the `::after` inset ring (`2px solid var(--cs-color-accent-solid)`).
- **Interactive sub-buttons (`Cancel`, `Retry`, `Remove`):** Placed outside the `<label>` click propagation (or `stopPropagation` on `<button type="button">`) so clicking `Retry` or `Cancel` never accidentally opens the OS file picker. Compact `xs` buttons include `<HitArea size="md" />` when below `1936px²`.

---

## 6. States & Motion Choreography

### State Visual Matrix

| State | Surface (`bg`) | `::after` Ring | Icon & Text |
| :--- | :--- | :--- | :--- |
| **Idle** | Variant `--cs-upload-area-bg` | `none` | `--cs-color-text-weak` icon, `--cs-color-text-strong` title |
| **Hover** | Variant hover (`base-soft-hover` / `elevated-hover`) | `none` | Icon lifts to `--cs-color-text-strong` |
| **Dragging (`[data-dragging]`)** | `var(--cs-color-accent-soft)` | `inset 0 0 0 2px var(--cs-color-accent-solid)` | Icon & title in `--cs-color-accent-soft-fg`; icon lifts `translateY(-2px) scale(1.06)` |
| **Uploading (`[data-status="uploading"]`)** | Variant `--cs-upload-area-bg` | `none` | Filename (`min-w-0 truncate`), tabular `%` via `<TextMorph tabular />`, `<Progress color="accent" />`, `Cancel` ghost button |
| **Done (`[data-status="done"]`)** | Variant `--cs-upload-area-bg` | `none` | Single-file: calm `Check` icon (`--cs-color-positive-soft-fg`), filename + size, `Remove` ghost button. Multi-file: dropzone stays ready; compact `divide-y` list below |
| **Error (`[data-status="error"]` / `[data-invalid]`)** | Variant `--cs-upload-area-bg` | `inset 0 0 0 2px var(--cs-color-negative-solid)` | `--cs-color-negative-soft-fg` icon & short error message (`"File exceeds 10 MB"` / `"Upload failed"`), `Retry` (`tertiary` `xs`) or `Clear` button |
| **Disabled (`[data-disabled]`)** | `--cs-color-disabled-bg` (`box-shadow: none`, borderless including `elevated`) | `none` | `--cs-color-disabled-fg` (`--cs-disabled-opacity: 1`), `pointer-events: none` |

### Motion Tokens & Physics

- **Hover & Surface Transitions:** `background-color`, `box-shadow`, and `color` transition over `var(--cs-dur-effect-fast)` (`100ms`) `var(--cs-ease-effect)`.
- **Tactile Press (`:active` on idle dropzone):** Gentle `scale: 0.99` (calibrated for large surfaces so it feels grounded, never rubbery) over `var(--cs-dur-press)` (`140ms`) `var(--cs-ease-press)`.
- **Drag-Over Lift:**
  - Enter `[data-dragging]`: `transform` (`translateY(-2px) scale(1.06)`) and `::after` ring fade/snap in over `var(--cs-dur-enter-sm)` (`260ms`) `var(--cs-ease-enter)`.
  - Exit `[data-dragging]`: settles smoothly back over `var(--cs-dur-exit-sm)` (`100ms`) `var(--cs-ease-exit)`.
- **Progress Bar Reveal (`.cs-upload-area-progress`):**
  - Uses CSS Grid `grid-template-rows: 0fr → 1fr` + `opacity: 0 → 1` (matching `UploadItem.svelte`), with `overflow-x: visible; overflow-y: clip; min-height: 0;` on the inner wrapper so progress caps are never clipped.
  - Open: `var(--cs-dur-enter-sm)` (`260ms`) `var(--cs-ease-enter)`.
  - Collapse (on completion or reset): `var(--cs-dur-exit-sm)` (`100ms`) `var(--cs-ease-exit)`.
- **Status / Copy Transitions:** Numeric percentages and status labels (`"42%"` → `"Complete"` / `"Upload failed"`) use `<TextMorph tabular />` for zero-jitter horizontal alignment.

---

## 7. Preview Stage Calibration (`UploadArea.preview.svelte`)

`PreviewSection.svelte` renders its stage on `bg-elevated shadow-elevated`. Placing `UploadArea variant="elevated"` directly inside `PreviewSection` creates elevated-on-elevated white-on-white (or double-rimmed dark mode) layering.

- **Canvas stage for `elevated`:** Mirror `Card.preview.svelte` by wrapping every `variant="elevated"` preview instance (both in `Variants` and the disabled `variant="elevated"` example in `States`) inside a dedicated `--cs-color-canvas` stage container:
  `rounded-2xl squircle-soft bg-canvas p-6` (with `border border-transparent`).
- **Keep `soft` & `sunken` on their natural surfaces:** `variant="soft"` sits directly on the `PreviewSection` `bg-elevated` stage; `variant="sunken"` sits inside `<Card variant="elevated">`.
