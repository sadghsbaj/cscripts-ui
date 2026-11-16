---
name: TextInput
kind: component
import: cs/svelte/text-input
exports:
  - TextInput
  - TextInputField
  - TextInputIcon
  - TextInputAction
  - TEXT_INPUT_VARIANTS
  - TEXT_INPUT_SIZES
  - TextInputVariant
  - TextInputSize
  - TextInputProps
  - TextInputFieldProps
  - TextInputIconComponentProps
  - TextInputIconProps
  - TextInputActionProps
  - TextInputContext
  - getTextInputContext
  - setTextInputContext
  - hasTextInputContext
---

# TextInput

## Overview
Compound single-line text input primitive composed of `<TextInput />`, `<TextInputField />`, `<TextInputIcon />`, and `<TextInputAction />`, featuring `soft` and `elevated` surfaces, 1:1 `Button`-aligned sizes (`xs`–`xl`), animated inline action slots, and ring-first invalid styling.

`<TextInput />` intentionally renders no built-in `<label>`, description, or error text—pair `<TextInputField id={...} />` with an external `<label for={...}>` and external validation/helper messaging. Its compound shell + context architecture also serves as the foundation for higher-level inputs such as `Combobox` and `NumberInput`.

## API

### `TextInput` Props
Extends `Omit<HTMLAttributes<HTMLDivElement>, "children">`. Renders the `.cs-text-input` shell `<div>` and provides `TextInputContext` to child primitives.

| Prop | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `variant` | `TextInputVariant` | Yes | — | Surface style: `"soft" \| "elevated"`. |
| `size` | `TextInputSize` | Yes | — | T-shirt size matching `Button` heights 1:1: `"xs"` (`28px`), `"sm"` (`32px`), `"md"` (`36px`), `"lg"` (`40px`), `"xl"` (`44px`). |
| `invalid` | `boolean` | No | `undefined` | Applies `data-invalid` negative ring/caret/icon styling on the shell and propagates `aria-invalid="true"` to `<TextInputField />`. |
| `disabled` | `boolean` | No | `undefined` | Applies `data-disabled` on the shell and propagates `disabled` to `<TextInputField />` and `<TextInputAction />`. |
| `readonly` | `boolean` | No | `undefined` | Applies `data-readonly` on the shell and propagates `readonly` to `<TextInputField />` (does **not** disable `<TextInputAction />`). |
| `ref` | `HTMLDivElement \| null` | No | `null` | `$bindable` reference to the root `<div>`. |
| `children` | `Snippet` | No | `undefined` | Compound slot content (`<TextInputField />`, `<TextInputIcon />`, `<TextInputAction />`). |

Place `invalid`, `disabled`, and `readonly` on `<TextInput>` rather than only on `<TextInputField>` so the shell, icons, actions, and `<input>` stay synchronized.

### `TextInputField` Props
Extends `Omit<HTMLInputAttributes, "size" | "children" | "value">`. Renders `<input class="cs-text-input-field">`.

| Prop | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `value` | `string` | No | `""` | `$bindable` input value. Supports `bind:value` and `bind:value={get, set}`. |
| `onValueChange` | `(value: string) => void` | No | `undefined` | Fires with `event.currentTarget.value` on every `input` event. |
| `disabled` | `boolean` | No | `undefined` | Local disabled override; effective state is `Boolean(disabled \|\| ctx?.disabled)`. |
| `readonly` | `boolean` | No | `undefined` | Local readonly override; effective state is `Boolean(readonly \|\| ctx?.readonly)`. |
| `invalid` | `boolean` | No | `undefined` | Local invalid override (`invalid ?? ctx?.invalid`); sets `aria-invalid="true"` when truthy. |
| `ref` | `HTMLInputElement \| null` | No | `null` | `$bindable` reference to the `<input>`. |

### `TextInputIcon` Props
Extends `Omit<SVGAttributes<SVGSVGElement>, "children" | "color">`. Renders `<Icon {...rest} aria-hidden="true" class={["cs-text-input-icon", className]} />` with `pointer-events: none` and `flex-shrink: 0`.

| Prop | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `icon` | `Component<TextInputIconComponentProps>` | Yes | — | Icon component rendered as a decorative slot (`aria-hidden="true"`). |
| `color` | `string` | No | `undefined` | Optional color forwarded to the icon component. |

### `TextInputAction` Props
Extends `Omit<HTMLButtonAttributes, "type">`. Renders `<button type="button" class="cs-text-input-action">` with an embedded `<HitArea size="sm" />`. `type="button"` is enforced after `{...rest}` so inline actions never submit an enclosing `<form>`.

| Prop | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `icon` | `Component<TextInputIconComponentProps>` | No | `undefined` | Optional icon component rendered with `aria-hidden="true"` and `.cs-text-input-action-icon`. |
| `visible` | `boolean` | No | `true` | Controls animated collapse/reveal. When `false`, sets `data-visible="false"`, `aria-hidden="true"`, and `tabindex={-1}`. |
| `disabled` | `boolean` | No | `undefined` | Local disabled override; effective state is `Boolean(disabled \|\| ctx?.disabled)`. Not affected by `readonly` on `<TextInput>`. |
| `ref` | `HTMLButtonElement \| null` | No | `null` | `$bindable` reference to the `<button>`. |
| `children` | `Snippet` | No | `undefined` | Custom button content (e.g. `<CopyIcon />`). |

### Exported Constants & Types
- `TEXT_INPUT_VARIANTS`: `readonly ["soft", "elevated"]` (`TextInputVariant`)
- `TEXT_INPUT_SIZES`: `readonly ["xs", "sm", "md", "lg", "xl"]` (`TextInputSize`)
- `TextInputProps`, `TextInputFieldProps`, `TextInputIconComponentProps`, `TextInputIconProps`, `TextInputActionProps`
- `TextInputContext`, `getTextInputContext`, `setTextInputContext`, `hasTextInputContext`

### `data-*` Attributes
- Root (`.cs-text-input`): `data-variant={variant}`, `data-size={size}`, `data-invalid` (when `invalid`), `data-disabled` (when `disabled`), `data-readonly` (when `readonly`).
- Action (`.cs-text-input-action`): `data-visible={visible ? "" : "false"}`.

### CSS Custom Properties
Overridable on `.cs-text-input`:

| Variable | Default | Description |
| :--- | :--- | :--- |
| `--cs-text-input-bg` | `var(--cs-color-base-soft)` (`soft`) / `var(--cs-color-elevated)` (`elevated`) | Shell background (`--cs-color-disabled-bg` / `--cs-color-disabled-bg-elevated` when `[data-disabled]`). |
| `--cs-text-input-bg-hover` | `var(--cs-color-base-soft-hover)` (`soft`) / `var(--cs-color-elevated-hover)` (`elevated`) | Shell hover background. |
| `--cs-text-input-fg` | `var(--cs-color-text-strong)` | Input text color (`var(--cs-color-disabled-fg)` when `[data-disabled]`). |
| `--cs-text-input-placeholder-fg` | `var(--cs-color-text-weak)` | Placeholder text color (`var(--cs-color-disabled-fg)` when `[data-disabled]`). |
| `--cs-text-input-caret` | `var(--cs-color-accent-solid)` | Input caret color (`var(--cs-color-negative-solid)` when `[data-invalid]:not([data-disabled])`). |
| `--cs-text-input-icon-fg` | `var(--cs-color-text-weak)` | `<TextInputIcon />` color (`var(--cs-color-negative-soft-fg)` when `[data-invalid]:not([data-disabled])`; `var(--cs-color-disabled-fg)` when `[data-disabled]`). |
| `--cs-text-input-shadow` | `none` (`soft`) / `var(--cs-shadow-elevated)` (`elevated`) | Shell box-shadow (`0 0 0 1px var(--cs-color-disabled-border)` for disabled `elevated`). |
| `--cs-text-input-shadow-hover` | `var(--cs-text-input-shadow)` (`soft`) / `var(--cs-shadow-elevated-hover)` (`elevated`) | Hover shell box-shadow. |
| `--cs-text-input-ring-shadow` | `inset 0 0 0 0px transparent` | Inset ring on `::after` (`inset 0 0 0 2px var(--cs-color-accent-solid)` on `:focus-within`; `inset 0 0 0 2px var(--cs-color-negative-solid)` on `[data-invalid]:not([data-disabled])`). |
| `--cs-text-input-ring-shadow-hover` | `var(--cs-text-input-ring-shadow)` | Hover inset ring on `::after`. |
| `--cs-text-input-height` | `28px` / `32px` / `36px` / `40px` / `44px` | Outer control height per `data-size` (`xs`–`xl`). |
| `--cs-text-input-font-size` | `var(--cs-text-xs)` (`xs`–`sm`), `var(--cs-text-sm)` (`md`–`lg`), `var(--cs-text-base)` (`xl`) | Input font size per `data-size`. |
| `--cs-text-input-radius` | `9px` / `10px` / `12px` / `13px` / `14px` | Border radius per `data-size` (`xs`–`xl`) with `corner-shape: var(--cs-squircle-soft)`. |
| `--cs-text-input-padding-inline` | `8px` / `10px` / `12px` / `14px` / `16px` | Base horizontal padding per `data-size` (`xs`–`xl`). |
| `--cs-text-input-gap` | `6px` (`xs`–`sm`), `8px` (`md`–`lg`), `10px` (`xl`) | Gap between shell children per `data-size`. |
| `--cs-text-input-icon-size` | `14px` (`xs`–`sm`), `16px` (`md`–`lg`), `18px` (`xl`) | Icon width and height per `data-size`. |
| `--cs-text-input-action-size` | `20px` / `24px` / `28px` / `30px` / `32px` | `<TextInputAction />` width and height per `data-size` (`xs`–`xl`). |
| `--cs-text-input-action-inset` | `4px` (`xs`–`md`), `5px` (`lg`), `6px` (`xl`) | Concentric edge padding when a visible `<TextInputAction />` sits at the start or end edge. |

## Examples

### Basic (`soft` & `elevated`)
```svelte
<script lang="ts">
    import { TextInput, TextInputField } from "cs/svelte/text-input";

    let value = $state("");
</script>

<TextInput variant="soft" size="md">
    <TextInputField bind:value placeholder="Soft input..." />
</TextInput>

<TextInput variant="elevated" size="md">
    <TextInputField bind:value placeholder="Elevated input..." />
</TextInput>
```

### Leading Icon + Conditional Clear Action
```svelte
<script lang="ts">
    import { Search, X } from "@lucide/svelte";
    import { TextInput, TextInputAction, TextInputField, TextInputIcon } from "cs/svelte/text-input";

    let query = $state("");
    let fieldRef = $state<HTMLInputElement | null>(null);

    function clear(): void {
        query = "";
        fieldRef?.focus();
    }
</script>

<TextInput variant="soft" size="md">
    <TextInputIcon icon={Search} />
    <TextInputField bind:ref={fieldRef} type="search" bind:value={query} placeholder="Search..." />
    <TextInputAction icon={X} aria-label="Clear search" visible={query.length > 0} onclick={clear} />
</TextInput>
```

### Password Reveal Toggle
```svelte
<script lang="ts">
    import { Eye, EyeOff, Lock } from "@lucide/svelte";
    import { TextInput, TextInputAction, TextInputField, TextInputIcon } from "cs/svelte/text-input";

    let password = $state("");
    let revealed = $state(false);
</script>

<TextInput variant="soft" size="md">
    <TextInputIcon icon={Lock} />
    <TextInputField
        type={revealed ? "text" : "password"}
        bind:value={password}
        placeholder="Password"
    />
    <TextInputAction
        icon={revealed ? EyeOff : Eye}
        aria-label={revealed ? "Hide password" : "Show password"}
        onclick={() => (revealed = !revealed)}
    />
</TextInput>
```

### Multiple Actions (`CopyIcon` + Clear)
```svelte
<script lang="ts">
    import { X } from "@lucide/svelte";
    import { CopyIcon } from "cs/svelte/clipboard";
    import { TextInput, TextInputAction, TextInputField } from "cs/svelte/text-input";

    let token = $state("cs_live_9f8a2c4e1b");
    let copied = $state(false);

    function copyToken(): void {
        copied = true;
        setTimeout(() => {
            copied = false;
        }, 1200);
    }
</script>

<TextInput variant="soft" size="md">
    <TextInputField bind:value={token} />
    <TextInputAction aria-label="Copy token" visible={token.length > 0} onclick={copyToken}>
        <CopyIcon {copied} class="cs-text-input-action-icon" />
    </TextInputAction>
    <TextInputAction
        icon={X}
        aria-label="Clear token"
        visible={token.length > 0}
        onclick={() => (token = "")}
    />
</TextInput>
```

### States (`invalid`, `disabled`, `readonly`)
```svelte
<script lang="ts">
    import { AlertCircle } from "@lucide/svelte";
    import { CopyIcon } from "cs/svelte/clipboard";
    import { TextInput, TextInputAction, TextInputField, TextInputIcon } from "cs/svelte/text-input";

    let email = $state("not-an-email");
    let shareUrl = "https://cscripts.dev/share/94a1";
    let copied = $state(false);
</script>

<TextInput variant="soft" size="md" invalid>
    <TextInputIcon icon={AlertCircle} />
    <TextInputField bind:value={email} />
</TextInput>

<TextInput variant="soft" size="md" disabled>
    <TextInputField value="Disabled input" />
</TextInput>

<TextInput variant="soft" size="md" readonly>
    <TextInputField value={shareUrl} />
    <TextInputAction aria-label="Copy share link" onclick={() => (copied = true)}>
        <CopyIcon {copied} class="cs-text-input-action-icon" />
    </TextInputAction>
</TextInput>
```

### External `<label>` Pairing
```svelte
<script lang="ts">
    import { TextInput, TextInputField } from "cs/svelte/text-input";

    const fieldId = $props.id();
    let email = $state("");
</script>

<div class="flex flex-col gap-1.5">
    <label for={fieldId} class="text-sm font-medium">Email address</label>
    <TextInput variant="soft" size="md">
        <TextInputField id={fieldId} type="email" bind:value={email} placeholder="you@example.com" />
    </TextInput>
</div>
```

## Behavior & Quirks
- **`$bindable()` pitfall (`value={fn()}`):** Never pass a non-bound expression (e.g. `value={getQuery()}`) to `<TextInputField />`. Because `value` is declared with `$bindable("")` and bound to the underlying `<input>`, passing a non-bound expression passes `svelte-check` without warning but throws a Svelte 5 runtime error on input **even if `onValueChange` is also passed**. When controlling state via a getter/setter or external store, you MUST use `bind:value={getter, setter}` (or `bind:value={() => current, () => {}}` paired with `onValueChange`), or `bind:value={state}` for local `$state`. `TextInputField` has no `defaultValue` prop; for uncontrolled mode, omit `value` (optionally pairing with `onValueChange`).
- **Ring-First `invalid` Styling:** `[data-invalid]:not([data-disabled])` preserves the neutral `soft` or `elevated` background fill rather than tinting the surface, rendering a `2px` `--cs-color-negative-solid` inset ring on `.cs-text-input::after`, setting `--cs-text-input-caret` to `--cs-color-negative-solid`, and tinting `<TextInputIcon />` via `--cs-color-negative-soft-fg`. Because the `[data-invalid]` rule follows `:focus-within`, invalid inputs keep their negative ring while focused.
- **Pointer Focus Delegation:** Clicking padding or gap regions directly on the `.cs-text-input` shell (`event.target === ref`) calls `event.preventDefault()` on `mousedown` and delegates focus to the registered `<TextInputField />` without blurring an already-focused input or flickering the focus ring.
- **Concentric Padding & Animated Action Collapse:** `:has()` selectors tighten edge padding by `2px` when `<TextInputIcon />` is first or last, and switch to `--cs-text-input-action-inset` when a visible `<TextInputAction />` sits at an outer edge. Toggling `visible={false}` smoothly collapses width, margin, opacity, and scale (`0.85`) over `var(--cs-dur-120)` while removing the button from the tab order and accessibility tree.
- **Native Chrome & Autofill Normalization:** `<TextInputField />` suppresses WebKit/Blink search cancel/decoration buttons and number spin buttons so custom `<TextInputAction />` buttons never overlap browser-injected controls, and overrides `:-webkit-autofill` styling to preserve `--cs-text-input-fg` and `--cs-text-input-caret`.
