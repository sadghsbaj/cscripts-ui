export interface RepeatHoldController {
    handlePointerDown(event: PointerEvent, disabled: boolean): void;
    stop(): void;
    cancel(): void;
    consumeClick(): boolean;
}

const REPEAT_INITIAL_DELAY_MS = 400;
const REPEAT_INTERVAL_MS = 85;

/**
 * Coordinates pointer press-and-hold auto-stepping without double-firing on the
 * trailing `click` event. Only responds to primary pointer button presses.
 */
export function createRepeatHold(onStep: () => void): RepeatHoldController {
    let delayTimer: ReturnType<typeof setTimeout> | undefined;
    let intervalTimer: ReturnType<typeof setInterval> | undefined;
    let hasRepeated = false;

    function clearTimers(): void {
        if (delayTimer !== undefined) {
            clearTimeout(delayTimer);
            delayTimer = undefined;
        }
        if (intervalTimer !== undefined) {
            clearInterval(intervalTimer);
            intervalTimer = undefined;
        }
    }

    function stop(): void {
        clearTimers();
    }

    function cancel(): void {
        clearTimers();
        hasRepeated = false;
    }

    function handlePointerDown(event: PointerEvent, disabled: boolean): void {
        clearTimers();
        hasRepeated = false;
        if (event.button !== 0 || disabled) return;

        delayTimer = setTimeout(() => {
            delayTimer = undefined;
            hasRepeated = true;
            onStep();
            intervalTimer = setInterval(() => {
                onStep();
            }, REPEAT_INTERVAL_MS);
        }, REPEAT_INITIAL_DELAY_MS);
    }

    function consumeClick(): boolean {
        if (!hasRepeated) return false;
        hasRepeated = false;
        return true;
    }

    return {
        handlePointerDown,
        stop,
        cancel,
        consumeClick,
    };
}
