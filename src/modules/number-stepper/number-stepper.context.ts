import { createContext } from "svelte";

import type { NumberStepperOrientation, NumberStepperSize, NumberStepperVariant } from "./index.ts";

export interface NumberStepperContext {
    readonly value: number;
    readonly min: number | undefined;
    readonly max: number | undefined;
    readonly step: number;
    readonly defaultValue: number | undefined;
    readonly variant: NumberStepperVariant;
    readonly size: NumberStepperSize;
    readonly orientation: NumberStepperOrientation;
    readonly disabled: boolean;
    readonly invalid: boolean;
    readonly canDecrement: boolean;
    readonly canIncrement: boolean;
    decrement(): void;
    increment(): void;
    stepBy(delta: number): void;
    commitValue(next: number): void;
    reset(): void;
}

export const [getNumberStepperContext, setNumberStepperContext, hasNumberStepperContext] =
    createContext<NumberStepperContext>();
