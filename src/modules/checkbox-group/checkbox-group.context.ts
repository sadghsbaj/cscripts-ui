import { createControlGroupContext, type ControlGroupContext } from "../../shared/control-group/index.ts";

export type CheckboxGroupContext = ControlGroupContext;

export const [getCheckboxGroupContext, setCheckboxGroupContext, hasCheckboxGroupContext] =
    createControlGroupContext<CheckboxGroupContext>();
