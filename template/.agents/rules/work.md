---
trigger: model_decision
description: "Rules for internal Pfleiderer work applications using cs/svelte/work and standalone single-file builds."
---

# Rule: Internal Work Applications (`cs/svelte/work`)

<meta>
  <scope>When to use cs/svelte/work, single-file Vite defaults, and work.docs.md discovery</scope>
  <applies_to>Internal company (Pfleiderer) tools and applications</applies_to>
  <version>1.0</version>
</meta>

<principles>
  - Use `cs/svelte/work` for all internal company (Pfleiderer) tools instead of inventing custom app headers, brand badges, intro screens, or page frames.
  - Read `./node_modules/cs/src/work/work.docs.md` before composing work-shell components or referencing Pfleiderer locations.
</principles>

<patterns>
  <vite_defaults>
    - Unless a server-hosted build is explicitly requested, configure `vite.config.ts` for standalone `dist/index.html` output with bundled Inter:
      - `csTheme({ mode: "system" })`
      - `csFont({ sans: "inter" })`
      - `csSingleFile({ enabled: true })`
  </vite_defaults>

  <module_docs>
    - **API & Composition:** Read `./node_modules/cs/src/work/work.docs.md` (and `./node_modules/cs/src/work/index.ts` for exact exports) before using `WorkAppIntro`, `WorkAppFrame`, `WorkAppHeader`, `WorkAppHeaderSegment`, `WorkAppMain`, `WorkAppThemeButton`, `WorkAppHelpButton`, `WorkAppStatusDot`, or `WORK_LOCATIONS`.
  </module_docs>
</patterns>

<constraints>
  - MUST NOT build custom app headers, Pfleiderer brand logos, theme toggle buttons, or intro screens when `cs/svelte/work` is used.
  - MUST NOT exceed the default `WorkAppFrame` workspace width (`--cs-container-7xl`); use horizontal scroll + fullscreen modal for wide tables.
</constraints>
