<script lang="ts">
    import type { ClassValue } from "svelte/elements";
    import {
        SidebarView,
        SidebarViews,
        type SidebarViewDirection,
        type SidebarViewInitialFocus,
        type SidebarViewTransition,
    } from "./index.ts";

    type ViewKey = "root" | "settings" | "account" | "empty";

    interface Props {
        value?: ViewKey;
        transition?: SidebarViewTransition;
        direction?: SidebarViewDirection;
        keepMounted?: boolean;
        animate?: boolean;
        viewsClass?: ClassValue;
        viewsRest?: Record<string, unknown>;
        settingsInitialFocus?: SidebarViewInitialFocus;
        useAutofocusOnAccount?: boolean;
        onRootViewRef?: (el: HTMLDivElement | null) => void;
    }

    let {
        value = $bindable<ViewKey>("root"),
        transition = "slide",
        direction = "auto",
        keepMounted = false,
        animate = true,
        viewsClass,
        viewsRest = {},
        settingsInitialFocus = "auto",
        useAutofocusOnAccount = true,
        onRootViewRef,
    }: Props = $props();

    let rootViewRef = $state<HTMLDivElement | null>(null);
    $effect(() => {
        onRootViewRef?.(rootViewRef);
    });
</script>

<button type="button" data-testid="outside-btn" onclick={() => (value = "settings")}>
    Outside Switch
</button>

<SidebarViews
    data-testid="sidebar-views"
    bind:value
    {transition}
    {direction}
    {keepMounted}
    {animate}
    class={viewsClass}
    {...viewsRest}
>
    <SidebarView bind:ref={rootViewRef} value="root" label="Main Menu" data-testid="view-root">
        <button
            type="button"
            data-testid="go-settings-btn"
            onclick={() => {
                value = "settings";
            }}
        >
            Settings
        </button>
        <button
            type="button"
            data-testid="go-empty-btn"
            onclick={() => {
                value = "empty";
            }}
        >
            Empty
        </button>
    </SidebarView>

    <SidebarView
        value="settings"
        label="Settings"
        initialFocus={settingsInitialFocus}
        data-testid="view-settings"
    >
        <button
            type="button"
            data-testid="back-root-btn"
            onclick={() => {
                value = "root";
            }}
        >
            Back
        </button>
        <button
            type="button"
            data-testid="go-account-btn"
            onclick={() => {
                value = "account";
            }}
        >
            Account
        </button>
    </SidebarView>

    <SidebarView value="account" label="Account" data-testid="view-account">
        <button
            type="button"
            data-testid="account-back-btn"
            onclick={() => {
                value = "settings";
            }}
        >
            Back
        </button>
        <input
            type="text"
            data-testid="account-input"
            data-autofocus={useAutofocusOnAccount ? "" : undefined}
        />
    </SidebarView>

    <SidebarView value="empty" data-testid="view-empty">
        <span>No focusable elements</span>
    </SidebarView>
</SidebarViews>
