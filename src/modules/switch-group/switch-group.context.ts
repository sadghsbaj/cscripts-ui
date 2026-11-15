import { createControlGroupContext, type ControlGroupContext } from "../../shared/control-group/index.ts";

export type SwitchGroupContext = ControlGroupContext;

export const [getSwitchGroupContext, setSwitchGroupContext, hasSwitchGroupContext] =
    createControlGroupContext<SwitchGroupContext>();
