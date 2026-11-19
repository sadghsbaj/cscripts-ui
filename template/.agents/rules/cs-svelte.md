---
trigger: glob
globs: "**/*.svelte, **/*.svelte.ts, **/vite.config.ts"
---

# Rule: Svelte 5, Modules & Vite Plugins

<meta>
  <scope>Mandatory Svelte 5 runes/syntax, cs module discovery, and cs/vite plugin configuration</scope>
  <applies_to>**/*.svelte, **/*.svelte.ts, **/vite.config.ts</applies_to>
  <version>1.0</version>
</meta>

<principles>
  - Read `./node_modules/cs/src/modules/<name>/<name>.docs.md` before using or wrapping any `cs/svelte/<name>` module—never guess props, attachments, or context APIs.
  - Use modern Svelte 5 runes, attachments, and snippets exclusively; never fall back to legacy Svelte 4 patterns.
  - Configure theme FOUC prevention, fonts, Lucide optimization, and single-file bundling through `cs/vite` rather than external Vite plugins or font packages.
</principles>

<patterns>
  <svelte_5_patterns>
    - **Reactivity (`$derived` over `$effect`):** Compute derived state with `$derived` / `$derived.by`. Reserve `$effect` strictly for genuine side effects not covered by `{@attach}`.
    - **`$bindable()` Props & Function Bindings:** Passing a non-bound expression (e.g. `value={fn()}`, `pressed={fn()}`, `checked={fn()}`) to a `$bindable()` prop passes `svelte-check` without warning—even when `on*Change` is also passed—but throws a runtime error when the component mutates the prop. Always use `bind:*={localState}`, Svelte 5 function bindings `bind:*={getter, setter}`, or omit the `$bindable()` prop for uncontrolled mode.
    - **Attachments over Actions:** Use `{@attach ...}` (`Attachment<HTMLElement>`) instead of legacy `use:action`.
    - **Type-Safe Context:** Use `createContext()` from `"svelte"` instead of `getContext` / `setContext` / `hasContext`.
    - **Template Declarations:** Use `{const ...}` and `{let ...}` in templates instead of legacy `{@const}`. Unlike legacy `{@const}` (which was implicitly reactive), plain `{const x = expr}` and `{let x = expr}` evaluate **only once** when the block mounts. Whenever `expr` depends on reactive state (especially inside a keyed `{#each}` or `{#snippet}`), you MUST wrap it in `$derived(...)` (`{const x = $derived(expr)}` or `{let x = $derived(expr)}`), or use `{let x = $state(...)}` for mutable local template state.
    - **Markup & DOM:** Always key `{#each}` loops (`(item.id)`), use `{#snippet}` / `{@render}` instead of `<slot>`, use `<script module lang="ts">` instead of `context="module"`, use `$props.id()` for unique IDs, and use `bind:this` instead of `document.querySelector` / `document.getElementById`.
    - **Static Containers:** Do not wrap simple static layout cards or flex/grid wrappers in redundant `.svelte` components when native HTML + UnoCSS utilities suffice.
  </svelte_5_patterns>

  <cs_modules_and_vite>
    - **Module Docs:** Before using any UI primitive, attachment, or state helper (`button`, `popover`, `tooltip`, `button-morph`, `toggle-button`, `clipboard`, `browser-storage`, `theme`, etc.), read `./node_modules/cs/src/modules/<name>/<name>.docs.md` (and `<name>/index.ts` if checking exact TypeScript types).
    - **Vite Plugins (`cs/vite`):** `vite.config.ts` uses `csTheme({ mode })`, `csFont({ sans })`, `csDocs()`, `csSingleFile({ enabled })`, and `csLucide({ enabled })`.
  </cs_modules_and_vite>
</patterns>

<constraints>
  - MUST NOT use `use:action`, `{@const}`, `<slot>`, `context="module"`, `getContext`/`setContext`/`hasContext`, or `document.querySelector`/`getElementById` inside `.svelte` files.
  - MUST NOT use plain `{const x = expr}` or `{let x = expr}` without `$derived(expr)` inside templates when `expr` reads reactive state.
  - MUST NOT pass non-bound expressions (e.g. `value={fn()}`, `pressed={fn()}`, `checked={fn()}`) to `$bindable()` props; use `bind:*={localState}`, `bind:*={getter, setter}`, or omit the prop for uncontrolled mode.
  - MUST NOT install `@fontsource/*` or `vite-plugin-singlefile`—use `csFont` and `csSingleFile` from `cs/vite`.
  - MUST NOT re-implement native `localStorage`/`sessionStorage`, `navigator.clipboard`, theme stores, or `popovertarget`/`interestfor` wiring when `cs` modules provide them.
</constraints>
