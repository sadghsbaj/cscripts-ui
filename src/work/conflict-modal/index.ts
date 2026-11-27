import type { Snippet } from "svelte";
import type { HTMLAttributes } from "svelte/elements";

export { default as WorkConflictModal } from "./WorkConflictModal.svelte";

export const WORK_CONFLICT_KINDS = [
    "value-mismatch",
    "delete-edit",
    "type-mismatch",
    "duplicate-array-key",
] as const;

export type WorkConflictKind = (typeof WORK_CONFLICT_KINDS)[number];

export type WorkConflictPathSegment =
    | { kind: "prop"; key: string }
    | { kind: "index"; index: number }
    | { kind: "array-item"; keyField: string; keyValue: string | number };

export interface WorkConflictField {
    id: string;
    label?: string;
    path?: readonly (string | number)[];
    segments?: readonly WorkConflictPathSegment[];
    pointer?: string;
    conflictKind?: WorkConflictKind;
    baseValue?: unknown;
    localValue?: unknown;
    remoteValue?: unknown;
}

export type WorkConflictSide = "local" | "remote";
export type WorkConflictChoice = WorkConflictSide | { custom: unknown };
export type WorkConflictChoices = Record<string, WorkConflictChoice>;

export interface WorkConflictQueuePosition {
    current: number;
    total: number;
}

export interface WorkConflictValueRenderContext {
    field: WorkConflictField;
    side: WorkConflictSide;
    value: unknown;
    selected: boolean;
}

export interface WorkConflictFieldRenderContext {
    field: WorkConflictField;
    label: string;
    choice: WorkConflictChoice | undefined;
    choose: (choice: WorkConflictChoice) => void;
    disabled: boolean;
}

export interface WorkConflictModalProps extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
    ref?: HTMLDivElement | null;
    conflictKey?: string | number | null;
    resourceLabel?: string | null;
    title?: string;
    description?: string;
    localLabel?: string;
    remoteLabel?: string;
    remoteDeleted?: boolean;
    fields?: readonly WorkConflictField[] | null;
    defaultChoice?: WorkConflictSide | null;
    showBaseValue?: boolean;
    queuePosition?: WorkConflictQueuePosition | null;
    busy?: boolean;
    errorMessage?: string | null;
    onKeepLocal?: () => void | Promise<void>;
    onKeepRemote?: () => void | Promise<void>;
    onApplyChoices?: (choices: WorkConflictChoices) => void | Promise<void>;
    renderValue?: Snippet<[WorkConflictValueRenderContext]>;
    renderField?: Snippet<[WorkConflictFieldRenderContext]>;
}
