# `cs` Code Style & ESLint Rules

## 1. Strict TypeScript & Typing Philosophy

This project enforces rigorous TypeScript standards. Code must be fully typed from end to end (`tsconfig.json` runs with strict mode enabled).

- **`any` is STRICTLY BANNED:** Never use `any`. Use proper generics, unions, or `unknown` with immediate type narrowing (guards/zod).
- **`unknown` requires strict narrowing:** Do not treat `unknown` as a lazy replacement for `any`.
- **`!` (Non-Null Assertion Operator) is BANNED (`@typescript-eslint/no-non-null-assertion`):** Never use `val!`. Use optional chaining (`val?.prop`), nullish coalescing (`val ?? fallback`), or guard clauses (`if (!val) return;`).
- **Explicit Return Types:** Functions exported from modules must declare their return types (`@typescript-eslint/explicit-function-return-type`).
- **Function Declarations:** Prefer standard `function name()` declarations over arrow functions (`const name = () => {}`) for external/reused functions.

## 2. ESLint Architecture & Custom Rules

The library uses a strict custom ESLint flat config bundle (`src/eslint/`) that enforces structural and architectural consistency:

### A. Custom Enforced Rules

- **UnoCSS Shortcuts (`shortcuts/enforce-shortcuts`):** Never combine raw layout utility classes (`flex justify-center items-center`) when a shortcut exists (`flex-center`). ESLint will auto-fix or error out.
- **No Unicode Dots (`unicode-dots/no-unicode-dots`):** Unicode separator dots (`·`, `•`, etc.) are forbidden in code and text. Always use an empty span with dot utilities (`<span class="dot-md"></span>`).
- **Modern Svelte Restrictions (`svelteConfig`):**
    - Legacy `use:action` directives are banned (use Svelte 5 `{@attach ...}` or element functions).
    - Direct `document.querySelector` / `document.getElementById` calls inside `.svelte` components are banned (use `bind:this` or element parameters).
    - Legacy `{@const}` tags are banned (use Svelte 5 `{const ...}` or `{let ...}`).

### B. File Naming Conventions (`eslint-plugin-unicorn`)

- **Standard TS/JS files:** `kebab-case` (`my-utility-file.ts`)
- **Svelte components (`.svelte`):** `PascalCase` (`MyButton.svelte`)
- **Svelte reactive modules (`.svelte.ts`):** `camelCase` (`theme.svelte.ts`)

## 3. Clean Code & Commenting Guidelines

- **Early Returns:** Write flat, readable code. Use early return guard clauses (`if (!condition) return;`) instead of deep nested `if`/`else` blocks.
- **Comments (Strictly English & Professional):**
    - **Quality over Quantity:** Write less, but meaningful comments. Never state the obvious (`// sets the value to 5`).
    - **Explain the "Why", not the "What":** If code handles a tricky edge case, a browser quirk, or a complex architectural decision, document why it was implemented that way.
- **No Console Logs:** `no-console` is set to warn (only `console.warn` and `console.error` are allowed outside of build scripts).
