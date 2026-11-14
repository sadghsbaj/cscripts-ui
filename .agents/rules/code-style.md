---
trigger: glob
globs: "**/*.ts, **/*.svelte, **/*.css"
---

# Rule: Code Style & Modern Svelte 5

<meta>
  <scope>TypeScript, Svelte 5 Runes/Templates, commenting, and tooling verification</scope>
  <applies_to>**/*.ts, **/*.svelte, **/*.css</applies_to>
  <version>1.0</version>
</meta>

<principles>
  - Absolute type safety: zero `any`, zero non-null assertions (`!`), narrow `unknown` immediately.
  - Prefer flat control flow with early returns over nested `if`/`else` blocks.
  - Use modern Svelte 5.57+ idioms exclusively—verify unfamiliar Svelte 5 APIs via the `svelte` MCP rather than guessing legacy patterns.
  - Strict ESLint (`eslint-plugin-unicorn` + custom rules under `src/eslint/rules/`) and `tsc --noEmit` are the baseline; write code that passes them on the first try.
</principles>

<patterns>
  <typescript>
    - **Type Safety:** NEVER use `any` or `!` (`@typescript-eslint/no-non-null-assertion`). Use optional chaining (`?.`), nullish coalescing (`??`), or guard clauses.
    - **Exports & Functions:** Declare explicit return types on exported functions. Prefer `function name()` declarations over arrow functions for top-level and exported functions.
    - **Control Flow:** Use early returns (`if (!ready) return;`) to keep nesting shallow.
  </typescript>

  <svelte_5>
    - **Attachments over Actions:** Always use `{@attach ...}` (`Attachment<HTMLElement>`) instead of legacy `use:action` (attachments also forward through components via `{...rest}`).
    - **Context:** Use `createContext()` (`[get, set, has]` / typed context helpers) instead of legacy `getContext`, `setContext`, or `hasContext`.
    - **Template Declarations:** Use `{const ...}` and `{let ...}` in templates instead of legacy `{@const}`. Remember `{let}` can hold `$derived`/`$state` reactive values, whereas plain `{const}` is static.
    - **Reactivity:** Prefer `$derived` and `$derived.by` for computed values. Reserve `$effect` strictly for genuine side effects that cannot be expressed declaratively.
    - **IDs & DOM Access:** Use `$props.id()` inside `.svelte` files for unique IDs. NEVER call `document.querySelector` or `document.getElementById` inside components—use `bind:this` (`ref = $bindable()`) or attachments.
    - **Classes:** Use Svelte 5 array syntax `class={["cs-...", className]}` instead of manual string concatenation.
  </svelte_5>

  <comments_and_tooling>
    - **Comments:** Write concise English *why*-comments only on non-obvious logic or browser/CSS quirks; never state the obvious and never add `<!-- @component -->` doc blocks.
    - **Self-Verification:** Run `bun run typecheck` and `bun run lint` (`bunx --bun eslint .`) after code changes.
  </comments_and_tooling>

  <browser_support>
    - **Modern Chromium-First:** Target modern Chromium as the primary runtime (~95% focus) with graceful degradation in other modern browsers—no legacy browser support or outdated polyfills.
    - **Modern Platform Features Encouraged:** Native `popover` (including `hint` / `interestfor`), CSS Anchor Positioning, CSS Nesting, `:has()`, `@container`, `corner-shape` (squircle), `text-box-trim` / `text-trim`, `light-dark()`, `oklab`/`oklch`, and `linear()` springs are explicitly approved. Do NOT reject them as "unsupported" in reviews.
  </browser_support>
</patterns>

<constraints>
  - MUST NOT use `any`, `!` non-null assertions, `use:action`, `{@const}`, `getContext`/`setContext`, or `document.querySelector`/`getElementById` in `.svelte`.
  - MUST NOT use `src/agents/` as library-authoring rules (that folder is only for consuming apps and will be trimmed separately).
</constraints>
