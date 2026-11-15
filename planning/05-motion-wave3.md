# 05 – Motion Token Migration (Wave 3 Backlog)

Die klaren Layer-2-Kandidaten (Wave 1 & Wave 2) sind auf `--cs-dur-*` und `--cs-ease-*` aus `src/css/foundation/motion.css` migriert. Folgende Module mit spezieller Choreografie oder JS-gekoppelten Timings wurden bewusst noch zurückgestellt:

- **`Overlay.svelte`:** Exit (`160ms`) ist direkt an `out:overlayExit({ duration: 160 })` im JS gekoppelt (`--cs-dur-enter-lg` / `--cs-dur-exit-lg` würden `440ms` / `180ms` + Anpassung der JS-Dauer erfordern).
- **`ButtonMorph.svelte` & `ButtonMorphItem.svelte`:** `350ms` (`--cs-button-morph-spring`) und `160ms` sind an JS-Timer (`MORPH_TRANSITION_DURATION_MS = 350`, `DEFAULT_GUARD_DELAY_MS = 350`) gekoppelt; Item-Stagger (`75ms` / `180ms`).
- **`ToggleButton.svelte` (`::after` Pressed Pop-In/Out):** Spezifisch abgestimmte `550ms` / `300ms` / `90ms` / `140ms` Choreografie, damit der Layer vor dem Schrumpfen unsichtbar fadet.
- **`Checkbox.svelte`:** Host (`140ms` / `120ms`) + Icon-Scale (`80ms`) + SVG-`stroke-dashoffset`-Zeichnen (`100ms` / `160ms` / `200ms`).
- **`ScrollArea.svelte` & `ScrollAreaOvershoot.internal.svelte`:** Asymmetrische Track-/Thumb-Transitions sowie Overshoot-Timing (`220ms` gekoppelt an `OVERSHOOT_RELEASE_DELAY_MS = 220`).
- **`CopyIcon.svelte`, `PasteIcon.svelte`, `Sparkle.internal.svelte`:** Mikro-Choreografien (`150ms`–`460ms` + Stagger/Shake/Pulse).
- **`WorkAppIntro.svelte`:** 4-Akt-Intro mit Staggern, synchronisiert zu den JS-Phasen-Timern (`550ms`, `1450ms`, `2450ms`, `2770ms`).
