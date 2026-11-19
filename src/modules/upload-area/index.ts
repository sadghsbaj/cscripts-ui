import type { Snippet } from "svelte";
import type { HTMLAttributes } from "svelte/elements";

export { default as UploadArea } from "./UploadArea.svelte";

export const UPLOAD_AREA_VARIANTS = ["soft", "elevated", "sunken"] as const;
export const UPLOAD_AREA_SIZES = ["sm", "md", "lg"] as const;

export type UploadAreaVariant = (typeof UPLOAD_AREA_VARIANTS)[number];
export type UploadAreaSize = (typeof UPLOAD_AREA_SIZES)[number];
export type UploadAreaStatus = "idle" | "uploading" | "done" | "error";
export type UploadAreaRejectionReason = "type" | "size" | "count";

export interface UploadAreaRejection {
    file: File;
    reason: UploadAreaRejectionReason;
}

export interface UploadAreaItem {
    id: string;
    file?: File;
    name: string;
    size?: number;
    sizeLabel?: string;
    status?: UploadAreaStatus;
    progress?: number;
    error?: string;
}

export interface UploadAreaProps extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
    variant: UploadAreaVariant;
    size: UploadAreaSize;
    /** Bindable list of accepted `File` objects. Use `bind:files` or `bind:files={get, set}`. */
    files?: File[];
    onFilesChange?: (files: File[]) => void;
    /** Optional controlled upload items for async progress/error/retry integration. */
    items?: UploadAreaItem[];
    onReject?: (rejections: UploadAreaRejection[]) => void;
    onRemove?: (item: UploadAreaItem, index: number) => void;
    onCancel?: (item: UploadAreaItem, index: number) => void;
    onRetry?: (item: UploadAreaItem, index: number) => void;
    accept?: string;
    multiple?: boolean;
    maxSize?: number;
    maxFiles?: number;
    label?: string;
    description?: string;
    error?: string;
    children?: Snippet<[{ dragging: boolean; disabled: boolean }]>;
    item?: Snippet<[UploadAreaItem, number]>;
    /** Bindable reference to the root `.cs-upload-area` element. */
    ref?: HTMLDivElement | null;
    /** Bindable reference to the underlying `<input type="file">` element. */
    inputRef?: HTMLInputElement | null;
    name?: string;
    id?: string;
    disabled?: boolean;
    invalid?: boolean;
}
