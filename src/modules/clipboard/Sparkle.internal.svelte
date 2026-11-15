<script lang="ts">
    import type { ClassValue } from "svelte/elements";

    interface SparkleProps {
        preset?: "copy" | "paste";
        class?: ClassValue;
    }

    let { preset = "copy", class: className }: SparkleProps = $props();
</script>

<span class={["cs-sparkle", className]} data-preset={preset} aria-hidden="true">
    <svg viewBox="0 0 16 16" class="cs-sparkle-particle cs-sparkle-star-1">
        <path d="M8 0C8 4.4 11.6 8 16 8C11.6 8 8 11.6 8 16C8 11.6 4.4 8 0 8C4.4 8 8 4.4 8 0Z" />
    </svg>
    <svg viewBox="0 0 16 16" class="cs-sparkle-particle cs-sparkle-star-2">
        <path d="M8 0C8 4.4 11.6 8 16 8C11.6 8 8 11.6 8 16C8 11.6 4.4 8 0 8C4.4 8 8 4.4 8 0Z" />
    </svg>

    <span class="cs-sparkle-particle cs-sparkle-dot-1"></span>
    <span class="cs-sparkle-particle cs-sparkle-dot-2"></span>
    <span class="cs-sparkle-particle cs-sparkle-dot-3"></span>
    <span class="cs-sparkle-particle cs-sparkle-dot-4"></span>
</span>

<style>
    @layer components.primitive {
        /* Toggling `display: none` -> `display: block` on feedback state
         * automatically restarts keyframe animations without JS timers. */
        .cs-sparkle {
            display: none;
            position: absolute;
            inset: 0;
            pointer-events: none;

            &[data-preset="copy"] {
                > .cs-sparkle-star-1 {
                    animation: cs-sparkle-copy-star-1 460ms var(--cs-ease-quart-out) forwards;
                }

                > .cs-sparkle-star-2 {
                    animation: cs-sparkle-copy-star-2 420ms var(--cs-ease-quart-out) 35ms forwards;
                }

                > .cs-sparkle-dot-1 {
                    animation: cs-sparkle-copy-dot-1 380ms var(--cs-ease-quart-out) 15ms forwards;
                }

                > .cs-sparkle-dot-2 {
                    animation: cs-sparkle-copy-dot-2 400ms var(--cs-ease-quart-out) 40ms forwards;
                }

                > .cs-sparkle-dot-3 {
                    animation: cs-sparkle-copy-dot-3 360ms var(--cs-ease-quart-out) 20ms forwards;
                }

                > .cs-sparkle-dot-4 {
                    animation: cs-sparkle-copy-dot-4 410ms var(--cs-ease-quart-out) 50ms forwards;
                }
            }

            &[data-preset="paste"] {
                > .cs-sparkle-star-1 {
                    animation: cs-sparkle-paste-star-1 460ms var(--cs-ease-quart-out) forwards;
                }

                > .cs-sparkle-star-2 {
                    animation: cs-sparkle-paste-star-2 420ms var(--cs-ease-quart-out) 35ms forwards;
                }

                > .cs-sparkle-dot-1 {
                    animation: cs-sparkle-paste-dot-1 380ms var(--cs-ease-quart-out) 15ms forwards;
                }

                > .cs-sparkle-dot-2 {
                    animation: cs-sparkle-paste-dot-2 400ms var(--cs-ease-quart-out) 40ms forwards;
                }

                > .cs-sparkle-dot-3 {
                    animation: cs-sparkle-paste-dot-3 360ms var(--cs-ease-quart-out) 20ms forwards;
                }

                > .cs-sparkle-dot-4 {
                    animation: cs-sparkle-paste-dot-4 410ms var(--cs-ease-quart-out) 50ms forwards;
                }
            }
        }

        .cs-sparkle-particle {
            position: absolute;
            top: 50%;
            left: 50%;
            opacity: 0;
            pointer-events: none;
        }

        .cs-sparkle-star-1,
        .cs-sparkle-star-2 {
            fill: currentColor;
            color: var(--cs-sparkle-fg);
        }

        .cs-sparkle-dot-1,
        .cs-sparkle-dot-2,
        .cs-sparkle-dot-3,
        .cs-sparkle-dot-4 {
            border-radius: var(--cs-radius-full);
            background-color: var(--cs-sparkle-fg);
        }

        .cs-sparkle-star-1 {
            width: 6.5px;
            height: 6.5px;
        }

        .cs-sparkle-star-2 {
            width: 5px;
            height: 5px;
        }

        .cs-sparkle-dot-1 {
            width: 2.2px;
            height: 2.2px;
        }

        .cs-sparkle-dot-2 {
            width: 2px;
            height: 2px;
        }

        .cs-sparkle-dot-3 {
            width: 1.8px;
            height: 1.8px;
        }

        .cs-sparkle-dot-4 {
            width: 2.2px;
            height: 2.2px;
        }

        @keyframes cs-sparkle-copy-star-1 {
            0% {
                transform: translate(-50%, -50%) scale(0) rotate(0deg);
                opacity: 0;
            }
            25% {
                transform: translate(calc(-50% + 9px), calc(-50% - 8px)) scale(1.3) rotate(45deg);
                opacity: 1;
            }
            60% {
                transform: translate(calc(-50% + 12px), calc(-50% - 10px)) scale(0.9) rotate(70deg);
                opacity: 0.9;
            }
            100% {
                transform: translate(calc(-50% + 14px), calc(-50% - 11px)) scale(0) rotate(90deg);
                opacity: 0;
            }
        }

        @keyframes cs-sparkle-copy-star-2 {
            0% {
                transform: translate(-50%, -50%) scale(0) rotate(0deg);
                opacity: 0;
            }
            30% {
                transform: translate(calc(-50% - 8px), calc(-50% + 5px)) scale(1.15) rotate(-30deg);
                opacity: 1;
            }
            65% {
                transform: translate(calc(-50% - 11px), calc(-50% + 7px)) scale(0.85) rotate(-50deg);
                opacity: 0.8;
            }
            100% {
                transform: translate(calc(-50% - 12px), calc(-50% + 8px)) scale(0) rotate(-65deg);
                opacity: 0;
            }
        }

        @keyframes cs-sparkle-copy-dot-1 {
            0% {
                transform: translate(-50%, -50%) scale(0);
                opacity: 1;
            }
            45% {
                transform: translate(calc(-50% - 7px), calc(-50% - 10px)) scale(1.1);
                opacity: 1;
            }
            100% {
                transform: translate(calc(-50% - 9px), calc(-50% - 12px)) scale(0);
                opacity: 0;
            }
        }

        @keyframes cs-sparkle-copy-dot-2 {
            0% {
                transform: translate(-50%, -50%) scale(0);
                opacity: 1;
            }
            45% {
                transform: translate(calc(-50% + 5px), calc(-50% - 12px)) scale(1.1);
                opacity: 1;
            }
            100% {
                transform: translate(calc(-50% + 7px), calc(-50% - 15px)) scale(0);
                opacity: 0;
            }
        }

        @keyframes cs-sparkle-copy-dot-3 {
            0% {
                transform: translate(-50%, -50%) scale(0);
                opacity: 1;
            }
            45% {
                transform: translate(calc(-50% + 11px), calc(-50% + 1px)) scale(1.1);
                opacity: 1;
            }
            100% {
                transform: translate(calc(-50% + 14px), calc(-50% + 2px)) scale(0);
                opacity: 0;
            }
        }

        @keyframes cs-sparkle-copy-dot-4 {
            0% {
                transform: translate(-50%, -50%) scale(0);
                opacity: 1;
            }
            45% {
                transform: translate(calc(-50% + 7px), calc(-50% + 9px)) scale(1.1);
                opacity: 1;
            }
            100% {
                transform: translate(calc(-50% + 9px), calc(-50% + 12px)) scale(0);
                opacity: 0;
            }
        }

        @keyframes cs-sparkle-paste-star-1 {
            0% {
                transform: translate(-50%, -50%) scale(0) rotate(0deg);
                opacity: 0;
            }
            25% {
                transform: translate(calc(-50% - 9px), calc(-50% - 7px)) scale(1.3) rotate(-45deg);
                opacity: 1;
            }
            60% {
                transform: translate(calc(-50% - 12px), calc(-50% - 9px)) scale(0.9) rotate(-70deg);
                opacity: 0.9;
            }
            100% {
                transform: translate(calc(-50% - 14px), calc(-50% - 10px)) scale(0) rotate(-90deg);
                opacity: 0;
            }
        }

        @keyframes cs-sparkle-paste-star-2 {
            0% {
                transform: translate(-50%, -50%) scale(0) rotate(0deg);
                opacity: 0;
            }
            30% {
                transform: translate(calc(-50% + 8px), calc(-50% + 6px)) scale(1.15) rotate(30deg);
                opacity: 1;
            }
            65% {
                transform: translate(calc(-50% + 11px), calc(-50% + 8px)) scale(0.85) rotate(50deg);
                opacity: 0.8;
            }
            100% {
                transform: translate(calc(-50% + 12px), calc(-50% + 9px)) scale(0) rotate(65deg);
                opacity: 0;
            }
        }

        @keyframes cs-sparkle-paste-dot-1 {
            0% {
                transform: translate(-50%, -50%) scale(0);
                opacity: 1;
            }
            45% {
                transform: translate(calc(-50% + 8px), calc(-50% - 9px)) scale(1.1);
                opacity: 1;
            }
            100% {
                transform: translate(calc(-50% + 10px), calc(-50% - 11px)) scale(0);
                opacity: 0;
            }
        }

        @keyframes cs-sparkle-paste-dot-2 {
            0% {
                transform: translate(-50%, -50%) scale(0);
                opacity: 1;
            }
            45% {
                transform: translate(calc(-50% - 5px), calc(-50% - 12px)) scale(1.1);
                opacity: 1;
            }
            100% {
                transform: translate(calc(-50% - 7px), calc(-50% - 14px)) scale(0);
                opacity: 0;
            }
        }

        @keyframes cs-sparkle-paste-dot-3 {
            0% {
                transform: translate(-50%, -50%) scale(0);
                opacity: 1;
            }
            45% {
                transform: translate(calc(-50% - 11px), calc(-50% + 2px)) scale(1.1);
                opacity: 1;
            }
            100% {
                transform: translate(calc(-50% - 14px), calc(-50% + 3px)) scale(0);
                opacity: 0;
            }
        }

        @keyframes cs-sparkle-paste-dot-4 {
            0% {
                transform: translate(-50%, -50%) scale(0);
                opacity: 1;
            }
            45% {
                transform: translate(calc(-50% - 7px), calc(-50% + 9px)) scale(1.1);
                opacity: 1;
            }
            100% {
                transform: translate(calc(-50% - 9px), calc(-50% + 12px)) scale(0);
                opacity: 0;
            }
        }
    }
</style>
