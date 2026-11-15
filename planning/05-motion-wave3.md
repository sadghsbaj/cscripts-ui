# 05 – Motion Token Migration (Wave 3 Backlog)

Die klaren Layer-2-Kandidaten (Wave 1 & Wave 2) sind auf `--cs-dur-*` und `--cs-ease-*` aus `src/css/foundation/motion.css` migriert. Folgende Module mit spezieller Choreografie oder JS-gekoppelten Timings wurden bewusst noch zurückgestellt:

- **`ScrollArea.svelte` & `ScrollAreaOvershoot.internal.svelte`:** Asymmetrische Track-/Thumb-Transitions sowie Overshoot-Timing (`220ms` gekoppelt an `OVERSHOOT_RELEASE_DELAY_MS = 220`).
- **`CopyIcon.svelte`, `PasteIcon.svelte`, `Sparkle.internal.svelte`:** Mikro-Choreografien (`150ms`–`460ms` + Stagger/Shake/Pulse).
- **`WorkAppIntro.svelte`:** 4-Akt-Intro mit Staggern, synchronisiert zu den JS-Phasen-Timern (`550ms`, `1450ms`, `2450ms`, `2770ms`).
