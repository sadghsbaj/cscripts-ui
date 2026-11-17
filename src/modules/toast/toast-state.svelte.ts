import type { Snippet } from "svelte";

import type {
    ToastApi,
    ToastColor,
    ToastCustomOptions,
    ToastOptions,
    ToastPromiseMessage,
    ToastPromiseOptions,
    ToastRecord,
    ToastShorthandConfig,
    ToastShorthandOptions,
    ToastSnippetProps,
} from "./index.ts";

let fallbackIdCounter = 0;

function generateToastId(): string {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
        return crypto.randomUUID();
    }
    fallbackIdCounter += 1;
    return `toast-${fallbackIdCounter}`;
}

function normalizePromiseMessage(
    message: ToastPromiseMessage,
    defaultColor: ToastColor,
    defaultDuration?: number
): Omit<ToastOptions, "id"> {
    if (typeof message === "string") {
        return {
            title: message,
            color: defaultColor,
            duration: defaultDuration,
        };
    }

    return {
        ...message,
        color: message.color ?? defaultColor,
        duration: message.duration ?? defaultDuration,
    };
}

class ToastStore {
    toasts = $state<ToastRecord[]>([]);
    heights = $state<Record<string, number>>({});

    upsert(options: ToastOptions): string {
        const id = options.id ?? generateToastId();
        const existingIndex = this.toasts.findIndex((item) => item.id === id);
        const now = Date.now();

        const existing = existingIndex !== -1 ? this.toasts[existingIndex] : undefined;
        if (existing) {
            this.toasts[existingIndex] = {
                ...existing,
                ...options,
                id,
                render: undefined,
                dismissible: options.dismissible ?? true,
                removed: false,
                updatedAt: now,
            };
            return id;
        }

        const record: ToastRecord = {
            ...options,
            id,
            dismissible: options.dismissible ?? true,
            mounted: false,
            removed: false,
            updatedAt: now,
        };

        this.toasts = [record, ...this.toasts];
        return id;
    }

    upsertCustom(render: Snippet<[ToastSnippetProps]>, options: ToastCustomOptions): string {
        const id = options.id ?? generateToastId();
        const existingIndex = this.toasts.findIndex((item) => item.id === id);
        const now = Date.now();

        const existing = existingIndex !== -1 ? this.toasts[existingIndex] : undefined;
        if (existing) {
            this.toasts[existingIndex] = {
                ...existing,
                ...options,
                id,
                title: undefined,
                description: undefined,
                icon: undefined,
                action: undefined,
                render,
                dismissible: options.dismissible ?? true,
                removed: false,
                updatedAt: now,
            };
            return id;
        }

        const record: ToastRecord = {
            ...options,
            id,
            render,
            dismissible: options.dismissible ?? true,
            mounted: false,
            removed: false,
            updatedAt: now,
        };

        this.toasts = [record, ...this.toasts];
        return id;
    }

    markMounted(id: string): void {
        const target = this.toasts.find((item) => item.id === id);
        if (!target || target.mounted) {
            return;
        }
        target.mounted = true;
    }

    setHeight(id: string, height: number): void {
        if (this.heights[id] === height) {
            return;
        }
        this.heights[id] = height;
    }

    dismiss(id?: string): void {
        if (id === undefined) {
            for (const item of this.toasts) {
                if (item.removed) {
                    continue;
                }
                item.removed = true;
                item.onDismiss?.(item);
            }
            return;
        }

        const target = this.toasts.find((item) => item.id === id);
        if (!target || target.removed) {
            return;
        }
        target.removed = true;
        target.onDismiss?.(target);
    }

    autoClose(id: string): void {
        const target = this.toasts.find((item) => item.id === id);
        if (!target || target.removed) {
            return;
        }
        target.removed = true;
        target.onAutoClose?.(target);
    }

    remove(id: string): void {
        this.toasts = this.toasts.filter((item) => item.id !== id);
        if (id in this.heights) {
            const { [id]: _, ...rest } = this.heights;
            this.heights = rest;
        }
    }
}

export const toastState = new ToastStore();

function enqueueToast(options: ToastOptions): string {
    return toastState.upsert(options);
}

function enqueueColorToast(
    color: ToastColor,
    titleOrOptions: string | ToastShorthandOptions,
    options?: ToastShorthandConfig
): string {
    if (typeof titleOrOptions === "string") {
        return toastState.upsert({ ...options, title: titleOrOptions, color });
    }
    return toastState.upsert({ ...titleOrOptions, color });
}

function enqueueCustomToast(render: Snippet<[ToastSnippetProps]>, options: ToastCustomOptions): string {
    return toastState.upsertCustom(render, options);
}

async function enqueuePromiseToast<T>(
    promise: Promise<T> | (() => Promise<T>),
    messages: ToastPromiseOptions<T>
): Promise<T> {
    const loadingOptions = normalizePromiseMessage(messages.loading, "base", Infinity);
    const id = toastState.upsert(loadingOptions);
    const targetPromise = typeof promise === "function" ? promise() : promise;

    try {
        const result = await targetPromise;
        const resolvedMessage = typeof messages.success === "function" ? messages.success(result) : messages.success;
        const successOptions = normalizePromiseMessage(resolvedMessage, "positive");
        toastState.upsert({ ...successOptions, id });
        return result;
    } catch (error) {
        const resolvedMessage = typeof messages.error === "function" ? messages.error(error) : messages.error;
        const errorOptions = normalizePromiseMessage(resolvedMessage, "negative");
        toastState.upsert({ ...errorOptions, id });
        throw error;
    }
}

function dismissToast(id?: string): void {
    toastState.dismiss(id);
}

export const toast: ToastApi = Object.assign(enqueueToast, {
    base: (titleOrOptions: string | ToastShorthandOptions, options?: ToastShorthandConfig) =>
        enqueueColorToast("base", titleOrOptions, options),
    accent: (titleOrOptions: string | ToastShorthandOptions, options?: ToastShorthandConfig) =>
        enqueueColorToast("accent", titleOrOptions, options),
    positive: (titleOrOptions: string | ToastShorthandOptions, options?: ToastShorthandConfig) =>
        enqueueColorToast("positive", titleOrOptions, options),
    caution: (titleOrOptions: string | ToastShorthandOptions, options?: ToastShorthandConfig) =>
        enqueueColorToast("caution", titleOrOptions, options),
    negative: (titleOrOptions: string | ToastShorthandOptions, options?: ToastShorthandConfig) =>
        enqueueColorToast("negative", titleOrOptions, options),
    custom: enqueueCustomToast,
    promise: enqueuePromiseToast,
    dismiss: dismissToast,
});
