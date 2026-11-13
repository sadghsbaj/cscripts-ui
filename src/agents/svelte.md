# `cs` Svelte 5 Architecture, Modern Syntax & State

All paths below are relative to `./node_modules/cs/src/agents/`.

## 1. Component Architecture Philosophy

- **UI Components & Interactive Primitives (`../svelte/primitives/`):** NEVER build standard UI controls or primitives from scratch before checking existing `cs/svelte/<primitive>`. Primitives use a clean compound architecture with colocated CSS and require explicit prop configuration (`variant`, `size`, and `color` where applicable) without implicit fallback defaults:
    1. **Discover available primitives:** Check `../svelte/primitives/<name>/index.ts` to see exported components, attachments, and types.
    2. **Inspect implementation & conventions:** Read the specific `../svelte/primitives/<name>/` files and architectural guides in `../svelte/explanations/` before using or building primitives.
- **Floating UI, Triggers & Motion (`cs/svelte/popover`, `cs/svelte/tooltip`):** All anchored floating surfaces (tooltips, dropdown menus, context menus, custom popovers) MUST build upon `<Popover>`, wired to their trigger via `{@attach popoverTrigger({ target })}`. NEVER hand-roll `popovertarget`, `interestfor`, `anchor-name`, hover timers, or open/close listeners.
    - **Trigger Modes (`popoverTrigger`, single source of truth for all trigger behavior):**
        - `mode: "auto"` (default): Native `popovertarget` toggle. `triggerOn: "pointerdown"` (default) opens instantly on primary mouse press, the right choice for menus, dropdowns, selects, comboboxes and split-button chevrons because opening is reversible and needs no cancel gesture. Touch and keyboard always use the native click path so touch scrolling never opens a menu. Use `triggerOn: "click"` for anything that should be cancellable by dragging off (e.g. confirmations).
        - `mode: "manual"`: Anchor wiring only. Open and close imperatively. Takes no `triggerOn`.
        - `mode: "hint"`: Hover and focus driven (`interestfor`) with optional `delay` (`"<open> <close>"`) and `dismissOnPress`. Already hardened: programmatic focus restoration (e.g. returning to the window after a click) never opens it, only hover or keyboard focus (`:focus-visible`) does. It dismisses on press, `Enter` / `Space` and scroll, re-arms on leave or blur, and shares a warmup window so adjacent triggers open instantly. NEVER re-implement any of this.
    - **Tooltips (`{@attach tooltip(...)}`):** A thin layer on `popoverTrigger({ mode: "hint" })` that mounts the `<Tooltip>` surface and manages `aria-describedby`. Fix trigger behavior in `popover.attach.ts` (covered by `popover.attach.test.ts`), never in the tooltip attachment.
    - **Default Spring Choreography (`animate = true`):** `<Popover>` provides a physics-driven directional entrance and exit (`--cs-spring-snappy`, `@starting-style`, scale and blur). It derives `--popover-dir-x`, `--popover-dir-y` and `--popover-origin` from `placement`, so the surface emerges from and recedes toward its anchor.
    - **Token Overrides for Custom Feel:** Do NOT write custom transition selectors or `@keyframes`. To tailor motion (e.g. compact micro-surfaces like `<Tooltip />`), override the `--popover-anim-*` custom properties (`distance`, `scale-start`, `scale-exit`, `blur-start`, `blur-exit`, `dur-in`, `dur-fade-in`, `dur-blur-in`, `dur-out`). Read `../svelte/primitives/popover/Popover.svelte` for the current defaults and `../svelte/primitives/tooltip/Tooltip.svelte` for an override example.
    - **Opt-Out for Bespoke Transitions:** Only set `animate={false}` when implementing a completely custom, non-spring transition system.
- **Button State Morphing (`cs/svelte/button-morph`):** When morphing between different buttons, actions, or state transitions (e.g. inline delete confirmation flows, multi-step actions, morphing between `<Button>`, `<ToggleButton>`, and `<CloseButton>`):
    - ALWAYS use `<ButtonMorph bind:value={state}>` with `<ButtonMorphItem value="...">` slots instead of manual `{#if}` swaps or ad-hoc CSS transitions.
    - `<ButtonMorph>` natively handles intrinsic dimension pre-caching (`ResizeObserver`), continuous surface and superellipse corner-shape interpolation (`--_morph-corner`), capture-phase accidental double-click protection (`guardDelay`), keyboard focus handoff, and hover-aware auto-reset timers (`resetTimeout`, `resetOnOutsideClick`, `resetOnEscape`).
    - **CRITICAL DISTINCTION — Standard Toggles vs. ButtonMorph:** Do NOT use `<ButtonMorph>` for standard toggle buttons! For normal pressed/unpressed formatting or tool toggles (e.g. Bold, Italic, Underline, active tool modes), always use native `<ToggleButton>` or `<ToggleButtonGroup>` with `pressed={...}`. `<ButtonMorph>` is strictly for morphing between distinct button instances/actions.
- **Static Layout & Surface Containers:** Do NOT wrap simple static layout containers (islands, cards, flex/grid wrappers) into redundant `.svelte` components when native HTML elements styled with UnoCSS utilities and semantic surface tokens (`bg-elevated`, `squircle`, etc.) suffice.

## 2. Modern Svelte 5 Features (MANDATORY — DO NOT USE LEGACY PATTERNS)

### A. Attachments (`{@attach ...}`) instead of `use:action`

Svelte 5.29+ replaces legacy `use:action` with **Attachments** (https://svelte.dev/docs/svelte/@attach). NEVER write `use:myAction`.

- **How it works:** An attachment is a function receiving the DOM element and optionally returning a cleanup function. It automatically re-runs when reactive state read inside it changes.
- **Library Attachments:** Read the respective folders in `../svelte/primitives/` (such as `scroll-fade`, `fade-mask`, `tooltip`, or `clipboard`) to discover built-in attachments before writing custom DOM logic:
    - **Clipboard (`cs/svelte/clipboard`):** NEVER write manual `navigator.clipboard` calls, custom `copied = $state(false)` timers, or manual `<Copy />` / `<Check />` icon toggles. Always pair `{@attach copyOnClick(...)}` with `<CopyIcon />` and `{@attach pasteOnClick(...)}` with `<PasteIcon />` inside `<Button>` / `<ToggleButton>` (the icons automatically animate via CSS data attributes). For imperative script-level clipboard access outside UI triggers, use `copyToClipboard()` and `readFromClipboard()` from `cs/svelte/clipboard`.
- **Syntax Example:**
    ```svelte
    <script lang="ts">
        import type { Attachment } from "svelte/attachments";

        let color = $state("red");

        function paint(c: string): Attachment<HTMLElement> {
            return (node) => {
                node.style.color = c;
                return () => {
                    node.style.color = "";
                };
            };
        }
    </script>

    <div {@attach paint(color)}>...</div>
    ```

### B. Type-Safe Context (`createContext`) instead of `setContext` / `getContext`

Always use `createContext` from `"svelte"` (https://svelte.dev/docs/svelte/context) instead of manual `setContext`/`getContext` with string/Symbol keys. It guarantees complete TypeScript type safety without manual generics or keys:

```ts
import { createContext } from "svelte";

export const [getTabsContext, setTabsContext] = createContext<TabsState>();
```

### C. Template Declaration Tags (`{const ...}` & `{let ...}`)

Modern Svelte supports inline declarations directly anywhere in the template markup (https://svelte.dev/docs/svelte/declaration-tags):

Use `{const x = ...}` (or `$derived` expressions) and `{let y = $state(...)}` directly inside markup scopes instead of polluting the top-level `<script>` block with single-use template variables.

### D. Reactivity Discipline (`$derived` over `$effect`)

NEVER abuse `$effect` to synchronize state (e.g., reading state A inside `$effect` to set state B).

- 95% of reactive values belong in `$derived` or `$derived.by(() => ...)`.
- Reserve `$effect` strictly for true side effects (manual DOM manipulation not covered by `{@attach}`, logging, or external imperative APIs).

### E. Clean Template & Script Practices

- **Keyed `#each` Blocks:** Always provide a unique key in loops: `{#each items as item (item.id)}`.
- **Snippets over Slots:** Strictly use `{#snippet name(params)}` and `{@render name(args)}`. NEVER use legacy `<slot>`.
- **Component Generics:** For generic components, use `<script lang="ts" generics="T extends Record<string, unknown>">`.
- **Module Context:** Use `<script module lang="ts">` (not `context="module"`) for module-level exports and shared non-instance logic.

## 3. Theme, Browser Storage & Build Configuration (`cs/svelte/theme`, `cs/svelte/browser-storage` & `cs/vite`)

### A. Browser Storage (`cs/svelte/browser-storage` — `../svelte/primitives/browser-storage/index.ts`)

Local HTML applications opened via `file://` in Chromium/Edge share a **single global `localStorage` / `sessionStorage` bucket**. Direct access to native `localStorage` or `sessionStorage` is strictly forbidden by ESLint (`browser-storage/no-native-storage`).

1. **Mandatory App Prefix in `main.ts` (`browser-storage/require-storage-prefix`):**
   Every application must call `configureStoragePrefix("<unique-app-id>")` with a non-empty string in `src/main.ts` before mounting `<App />`.
2. **Reading & Writing Storage:**
   Always use the helpers from `cs/svelte/browser-storage` (`getLocalStorage`, `setLocalStorage`, `getLocalStorageJson`, `setLocalStorageJson`, `removeLocalStorage`, `clearLocalStorage`, `onLocalStorageChange`, and the matching `SessionStorage` equivalents). All helpers automatically prepend the configured app prefix (`"<prefix>:<key>"`), handle `SecurityError` / `QuotaExceededError` / SSR safely, and scope `clearLocalStorage()` strictly to the current app's prefix.
3. **Global Cross-App Keys (`{ prefix: false }`):**
   Pass `{ prefix: false }` ONLY for intentional cross-application keys that should synchronize across all local `file://` tools (such as `"cs-theme"`).

### B. Theme Management (`cs/svelte/theme` & `../vite/theme.ts`)

Theme state (`light` | `dark` | `system`), localStorage persistence (`cs-theme`), OS media query listeners, and native View Transitions (`document.startViewTransition` with automatic data-theme-switching transition suspension) are completely handled by `cs/svelte/theme` in combination with the FOUC-prevention inline script in `../vite/theme.ts`.

NEVER implement a custom theme store or manual `document.documentElement.dataset.theme` toggling.

**Usage in Svelte:**

```ts
import { theme, type ThemeMode } from "cs/svelte/theme";

// Read reactive properties ($state-backed getters):
// theme.mode -> "light" | "dark" | "system"
// theme.resolved -> "light" | "dark"
// theme.icon -> Monitor | Sun | Moon (Lucide component matching preference)
// theme.resolvedIcon -> Sun | Moon (Lucide component matching applied scheme)

// Mutate theme (automatically triggers View Transition & storage sync):
theme.toggle();
theme.cycle(); // Cycles through ["system", "light", "dark"]
theme.set("dark");
```

> **SSR Note:** For multi-request SSR apps requiring request isolation, instantiate `new ThemeManager()` inside a context (`createContext`) instead of mutating the global `theme` singleton.

### C. Vite Plugins (`cs/vite` — `../vite/index.ts`)

`vite.config.ts` uses four explicit plugins from `cs/vite` (all options are required so project configuration is immediately visible):

```ts
import { csFont, csLucide, csSingleFile, csTheme } from "cs/vite";

// 1. Initial theme & FOUC prevention ("light" | "dark" | "system")
csTheme({ mode: "system" });

// 2. Root sans-serif font stack ("system" | "inter")
// "inter" automatically uses the bundled Inter Variable woff2 without external font packages.
csFont({ sans: "system" });

// 3. Single-file HTML bundling (true | false)
// When enabled: true, bundles all JS, CSS, SVGs, public icons, and Inter font into a single dist/index.html.
csSingleFile({ enabled: false });

// 4. On-the-fly @lucide/svelte barrel optimizer (true | false)
// Automatically rewrites `import { Check } from "@lucide/svelte"` into direct icon subpath imports.
csLucide({ enabled: true });
```

NEVER install external font packages (like `@fontsource/*`) or `vite-plugin-singlefile`—always configure `csFont` and `csSingleFile` in `vite.config.ts`.
