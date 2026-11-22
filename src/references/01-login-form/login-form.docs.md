# 01 · Login Form

## Intent

Production-grade authentication card pairing an `elevated` surface container with `soft` inset controls, field-level validation, and a progressive disclosure panel for alternative sign-in methods.

## Used Modules

- `cs/svelte/card` (`Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardBody`)
- `cs/svelte/text-input` (`TextInput`, `TextInputIcon`, `TextInputField`, `TextInputAction`)
- `cs/svelte/checkbox` (`Checkbox`)
- `cs/svelte/hit-area` (`HitArea`)
- `cs/svelte/button` (`Button`, `ButtonIcon`, `ButtonLabel`)
- `cs/svelte/collapsible` (`Collapsible`)

## Key Patterns

- **Surface Pairing:** `Card variant="elevated" size="lg"` on `bg-canvas` with `soft` inner controls (`TextInput`, `Checkbox`) to keep inputs recessed without borders.
- **Label & Error Binding:** Unique `$props.id()` identifiers wire `<label for={...}>`, `<TextInputField id={...} aria-describedby={...} />`, and inline error messages.
- **Password Reveal:** `<TextInputAction>` toggles between `Eye` and `EyeOff` and stays hidden until `password.length > 0 || showPassword`.
- **Hit Target Expansion:** `<HitArea size="md" />` expands the compact `Forgot?` button to a `44px` target without shifting text layout; both `Remember me` and `Forgot?` use `text-trim` for optical alignment.
- **Progressive Disclosure:** `Other ways` uses `<Collapsible bind:open={altOpen} id={altPanelId} motion="swell" class="w-full">` with an inner `pt-3 pb-1` wrapper for spacing and shadow/ring breathing room, while the chevron rotation aligns to `--cs-dur-240` / `--cs-ease-quart-out` on enter and `--cs-dur-160` / `--cs-ease-exit` on exit.

## States

- **Normal:** Default editable fields, `Remember me` toggle, and `"Sign in"` submit button.
- **Error:** Field-level `invalid` ring/caret/icon tinting with `aria-describedby` inline error messages.
- **Submitting:** Controls disabled via `disabled={isSubmitting}`, `aria-busy="true"` on the submit button, and `"Signing in..."` label.
