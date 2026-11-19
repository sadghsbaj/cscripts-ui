---
trigger: model_decision
description: "When to inspect cs reference compositions in ./node_modules/cs/src/references/ before building multi-component views, forms, toolbars, or full app layouts."
---

# Rule: Reference Compositions (`cs/src/references`)

<meta>
  <scope>Discovering and reusing production-grade cs composition references in consumer applications</scope>
  <applies_to>Multi-component views, forms, toolbars, and full app layouts</applies_to>
  <version>1.0</version>
</meta>

<principles>
  - Inspect existing `cs` reference compositions before inventing multi-component layouts, forms, toolbars, or page shells from scratch.
  - Reference components (`*.svelte`) use only public `cs/svelte/*`, `cs/css`, and UnoCSS tokens, making their patterns directly adaptable to consumer apps.
</principles>

<patterns>
  <discovery>
    - Read `./node_modules/cs/src/references/INDEX.md` first to locate matching reference compositions by use case and modules used.
    - For any relevant entry, read both its `<Name>.svelte` implementation and `<name>.docs.md` notes before writing new UI code.
    - Pair reference patterns with module-level API verification in `./node_modules/cs/src/modules/<name>/<name>.docs.md`.
  </discovery>
</patterns>

<constraints>
  - MUST inspect `./node_modules/cs/src/references/INDEX.md` and read matching `*.svelte` / `*.docs.md` files before building multi-component views, forms, toolbars, or full app layouts.
  - MUST NOT copy playground-only `*.preview.svelte` wrappers into consumer application code; adapt the pure `<Name>.svelte` reference components instead.
</constraints>
