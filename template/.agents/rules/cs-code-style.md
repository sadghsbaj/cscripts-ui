---
trigger: glob
globs: "**/*.ts, **/*.svelte, **/*.css"
---

# Rule: Code Style & ESLint

<meta>
  <scope>Strict TypeScript, cs/eslint verification, naming reference, and commenting</scope>
  <applies_to>**/*.ts, **/*.svelte, **/*.css</applies_to>
  <version>1.1</version>
</meta>

<principles>
  - Absolute type safety: zero `any`, zero `!` non-null assertions, and immediate narrowing of `unknown`.
  - Flat control flow with early returns over nested `if`/`else` blocks.
  - This project uses `cs/eslint`; run `bun run lint` and `bun run check` after edits to verify compliance.
</principles>

<patterns>
  <typescript>
    - **Exports & Functions:** Declare explicit return types on exported functions. Prefer `function name()` declarations over arrow functions for exported/reused functions.
    - **Null Handling:** Use optional chaining (`?.`), nullish coalescing (`??`), or guard clauses (`if (!val) return;`) instead of `!`.
  </typescript>

  <eslint_and_naming>
    - **Custom Rules (`cs/eslint`):** Run `bun run lint` to verify. Whenever an unfamiliar custom rule triggers, inspect `./node_modules/cs/src/eslint/rules/` for its exact rationale and fix.
    - **Naming Conventions:** Follow `cs-naming.md` for all file suffixes (`PascalCase.svelte`, `kebab-case.ts`, `kebab-case.svelte.ts`, `kebab-case.attach.ts`), CSS tokens, `data-*` attributes, and canonical terminology.
  </eslint_and_naming>

  <clean_code>
    - **Comments:** Write concise English *why*-comments only on non-obvious logic or browser/CSS quirks; never state the obvious and never add `<!-- @component -->` blocks.
    - **Logging:** Avoid `console.log` (`no-console` warns; use `console.warn` or `console.error` only when appropriate).
  </clean_code>
</patterns>

<constraints>
  - MUST NOT use `any` or `!` non-null assertions.
  - MUST NOT disable ESLint rules to bypass structural or accessibility checks without user alignment.
</constraints>
