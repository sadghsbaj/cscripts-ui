# `cs` Reference Compositions

Pure, production-grade `cs` compositions using only public `cs/svelte/*`, `cs/css`, and UnoCSS tokens (no `playground/` helpers).

## File Structure

Each reference lives in `src/references/<nn>-<kebab-name>/`:

- `<Name>.svelte` — Pure, copy-pasteable reference component using only public `cs` APIs and UnoCSS utilities.
- `<Name>.preview.svelte` — Thin playground wrapper exporting `id`, `label`, and `layout = "stage"`.
- `<name>.docs.md` — Concise notes on intent, used modules, and layout decisions.

## Index

| Reference | Component | Docs | Modules Used |
| :--- | :--- | :--- | :--- |
| `00 · Proof of Concept` | [`00-proof-of-concept/ProofOfConcept.svelte`](./00-proof-of-concept/ProofOfConcept.svelte) | [`00-proof-of-concept/proof-of-concept.docs.md`](./00-proof-of-concept/proof-of-concept.docs.md) | `cs/svelte/button` |
| `01 · Login Form` | [`01-login-form/LoginForm.svelte`](./01-login-form/LoginForm.svelte) | [`01-login-form/login-form.docs.md`](./01-login-form/login-form.docs.md) | `cs/svelte/card`, `cs/svelte/text-input`, `cs/svelte/checkbox`, `cs/svelte/hit-area`, `cs/svelte/button` |
| `02 · Settings Row` | [`02-settings-row/SettingsRow.svelte`](./02-settings-row/SettingsRow.svelte) | [`02-settings-row/settings-row.docs.md`](./02-settings-row/settings-row.docs.md) | `cs/svelte/card`, `cs/svelte/switch`, `cs/svelte/select` |
