# 05 – Motion Token Migration (Wave 3 Backlog)

Die klaren Layer-2-Kandidaten (Wave 1 & Wave 2) sind auf `--cs-dur-*` und `--cs-ease-*` aus `src/css/foundation/motion.css` migriert. Folgende Module mit spezieller Choreografie oder JS-gekoppelten Timings wurden bewusst noch zurückgestellt:

- **`ScrollArea.svelte`:** Asymmetrische Track-/Thumb-Transitions.
- **`CopyIcon.svelte`, `PasteIcon.svelte`, `Sparkle.internal.svelte`:** Mikro-Choreografien (`150ms`–`460ms` + Stagger/Shake/Pulse).
- **`WorkAppIntro.svelte`:** 4-Akt-Intro mit Staggern, synchronisiert zu den JS-Phasen-Timern (`550ms`, `1450ms`, `2450ms`, `2770ms`).
