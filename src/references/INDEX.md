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
| `03 · Filter Bar` | [`03-filter-bar/FilterBar.svelte`](./03-filter-bar/FilterBar.svelte) | [`03-filter-bar/filter-bar.docs.md`](./03-filter-bar/filter-bar.docs.md) | `cs/svelte/text-input`, `cs/svelte/segmented-control`, `cs/svelte/dropdown`, `cs/svelte/button`, `cs/svelte/chip`, `cs/svelte/card` |
| `04 · Confirmation Dialog` | [`04-confirmation-dialog/DiscardDialog.svelte`](./04-confirmation-dialog/DiscardDialog.svelte), [`DeleteDialog.svelte`](./04-confirmation-dialog/DeleteDialog.svelte) | [`04-confirmation-dialog/confirmation-dialog.docs.md`](./04-confirmation-dialog/confirmation-dialog.docs.md) | `cs/svelte/modal`, `cs/svelte/overlay`, `cs/svelte/button`, `cs/svelte/text-input`, `cs/svelte/focus` |
| `05 · Upload Item` | [`05-upload-item/UploadItem.svelte`](./05-upload-item/UploadItem.svelte) | [`05-upload-item/upload-item.docs.md`](./05-upload-item/upload-item.docs.md) | `cs/svelte/card`, `cs/svelte/progress`, `cs/svelte/text-morph`, `cs/svelte/button`, `cs/svelte/hit-area` |
| `06 · Task List` | [`06-task-list/TaskList.svelte`](./06-task-list/TaskList.svelte) | [`06-task-list/task-list.docs.md`](./06-task-list/task-list.docs.md) | `cs/svelte/card`, `cs/svelte/checkbox`, `cs/svelte/number-morph`, `cs/svelte/text-morph` |
| `07 · Plan Picker` | [`07-plan-picker/PlanPicker.svelte`](./07-plan-picker/PlanPicker.svelte) | [`07-plan-picker/plan-picker.docs.md`](./07-plan-picker/plan-picker.docs.md) | `cs/svelte/segmented-control`, `cs/svelte/number-morph`, `cs/svelte/card`, `cs/svelte/badge`, `cs/svelte/button` |
| `08 · Comment Composer` | [`08-comment-composer/CommentComposer.svelte`](./08-comment-composer/CommentComposer.svelte) | [`08-comment-composer/comment-composer.docs.md`](./08-comment-composer/comment-composer.docs.md) | `cs/svelte/card`, `cs/svelte/text-area`, `cs/svelte/auto-resize`, `cs/svelte/button`, `cs/svelte/hit-area`, `cs/svelte/tooltip`, `cs/svelte/kbd`, `cs/svelte/text-morph` |
| `09 · Email Client` | [`09-email-client/EmailClient.svelte`](./09-email-client/EmailClient.svelte) | [`09-email-client/email-client.docs.md`](./09-email-client/email-client.docs.md) | `cs/svelte/button`, `cs/svelte/hit-area`, `cs/svelte/text-input`, `cs/svelte/kbd`, `cs/svelte/segmented-control`, `cs/svelte/scroll-area`, `cs/svelte/scroll-fade`, `cs/svelte/tooltip`, `cs/svelte/dropdown`, `cs/svelte/text-area`, `cs/svelte/auto-resize`, `cs/svelte/toast` |
