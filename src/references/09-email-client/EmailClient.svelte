<script lang="ts">
    import {
        Archive,
        ChevronDown,
        Download,
        FileText,
        Forward,
        Inbox,
        Mail,
        MailOpen,
        MoreHorizontal,
        Paperclip,
        Reply,
        Search,
        Send,
        SquarePen,
        Trash2,
        X,
    } from "@lucide/svelte";
    import { tick, type Component } from "svelte";
    import { fade } from "svelte/transition";
    import { autoResize } from "cs/svelte/auto-resize";
    import { Button, ButtonIcon, ButtonLabel } from "cs/svelte/button";
    import {
        Dropdown,
        DropdownContent,
        DropdownItem,
        DropdownSeparator,
        dropdownTrigger,
    } from "cs/svelte/dropdown";
    import { HitArea } from "cs/svelte/hit-area";
    import { Kbd, KbdGroup, KbdSeparator } from "cs/svelte/kbd";
    import { ScrollArea, ScrollAreaContent } from "cs/svelte/scroll-area";
    import { scrollFade } from "cs/svelte/scroll-fade";
    import {
        SegmentedControl,
        SegmentedControlItem,
        SegmentedControlLabel,
    } from "cs/svelte/segmented-control";
    import { TextArea } from "cs/svelte/text-area";
    import { TextInput, TextInputAction, TextInputField, TextInputIcon } from "cs/svelte/text-input";
    import { toast } from "cs/svelte/toast";
    import { tooltip } from "cs/svelte/tooltip";
    import {
        createInitialMessages,
        EMAIL_FOLDERS,
        type EmailFolder,
        type EmailMessage,
    } from "./email-client.data.internal";

    type FilterMode = "all" | "unread";
    type ComposeMode = "new" | "forward" | null;

    const FOLDER_ICONS: Record<EmailFolder, Component<{ class?: string; strokeWidth?: number }>> = {
        inbox: Inbox,
        sent: Send,
        drafts: FileText,
        archive: Archive,
    };

    let messages = $state<EmailMessage[]>(createInitialMessages());
    let activeFolder = $state<EmailFolder>("inbox");
    let filterMode = $state<FilterMode>("all");
    let query = $state("");
    let selectedId = $state<string | null>("msg-01");
    let isEarlierExpanded = $state(false);
    let isReplyOpen = $state(false);
    let replyText = $state("");

    let composeMode = $state<ComposeMode>(null);
    let composeTo = $state("");
    let composeSubject = $state("");
    let composeBody = $state("");

    let searchInputRef = $state<HTMLInputElement | null>(null);
    let replyTextareaRef = $state<HTMLTextAreaElement | null>(null);
    let composeToInputRef = $state<HTMLInputElement | null>(null);

    const inboxUnreadCount = $derived(
        messages.filter((message) => message.folder === "inbox" && message.unread).length,
    );

    const filteredMessages = $derived.by(() => {
        const normalizedQuery = query.trim().toLowerCase();
        return messages.filter((message) => {
            if (message.folder !== activeFolder) return false;
            if (filterMode === "unread" && !message.unread) return false;
            if (!normalizedQuery) return true;

            return (
                message.sender.toLowerCase().includes(normalizedQuery) ||
                message.subject.toLowerCase().includes(normalizedQuery) ||
                message.preview.toLowerCase().includes(normalizedQuery)
            );
        });
    });

    const selectedMessage = $derived(
        messages.find((message) => message.id === selectedId && message.folder === activeFolder) ?? null,
    );

    const canSendCompose = $derived(
        composeTo.trim().length > 0 && composeSubject.trim().length > 0 && composeBody.trim().length > 0,
    );

    const emptyListLabel = $derived.by(() => {
        if (query.trim()) return "No matching messages";
        if (filterMode === "unread") return "No unread messages";
        return "No messages";
    });

    function selectFolder(folder: EmailFolder): void {
        if (composeMode !== null) {
            closeCompose();
        }
        if (activeFolder === folder) return;
        activeFolder = folder;
        isEarlierExpanded = false;
        isReplyOpen = false;
        replyText = "";

        const firstInFolder = messages.find(
            (message) => message.folder === folder && (filterMode === "all" || message.unread),
        );
        selectedId = firstInFolder?.id ?? null;
    }

    function selectMessage(message: EmailMessage): void {
        if (composeMode !== null) {
            closeCompose();
        }
        selectedId = message.id;
        if (message.unread) {
            message.unread = false;
        }
        isEarlierExpanded = false;
        isReplyOpen = false;
        replyText = "";
    }

    function clearSearch(): void {
        query = "";
        searchInputRef?.focus();
    }

    function handleWindowKeydown(event: KeyboardEvent): void {
        if (event.key !== "/" || event.ctrlKey || event.metaKey || event.altKey) return;
        if (composeMode !== null) return;

        const target = event.target;
        if (
            target instanceof HTMLElement &&
            (target.tagName === "INPUT" ||
                target.tagName === "TEXTAREA" ||
                target.tagName === "SELECT" ||
                target.isContentEditable)
        ) {
            return;
        }

        event.preventDefault();
        searchInputRef?.focus();
    }

    async function openNewCompose(): Promise<void> {
        resetComposeForm();
        isReplyOpen = false;
        replyText = "";
        composeMode = "new";
        await tick();
        composeToInputRef?.focus();
    }

    async function openForward(): Promise<void> {
        if (!selectedMessage) return;
        isReplyOpen = false;
        replyText = "";
        composeTo = "";
        composeSubject = selectedMessage.subject.startsWith("Fwd:")
            ? selectedMessage.subject
            : `Fwd: ${selectedMessage.subject}`;
        composeBody = `\n\n---------- Forwarded message ---------\nFrom: ${selectedMessage.sender} <${selectedMessage.email}>\nSubject: ${selectedMessage.subject}\n\n${selectedMessage.body.join("\n\n")}`;
        composeMode = "forward";
        await tick();
        composeToInputRef?.focus();
    }

    function resetComposeForm(): void {
        composeTo = "";
        composeSubject = "";
        composeBody = "";
    }

    function closeCompose(): void {
        composeMode = null;
        resetComposeForm();
    }

    function sendCompose(): void {
        if (!canSendCompose) return;

        const trimmedBody = composeBody.trim();
        const paragraphs = trimmedBody
            .split(/\n{2,}/)
            .map((part) => part.trim())
            .filter(Boolean);

        const nextMessage: EmailMessage = {
            id: `msg-${Date.now()}`,
            folder: "sent",
            sender: "Colin",
            initials: "CK",
            email: "colin@cscripts.ui",
            subject: composeSubject.trim(),
            preview: paragraphs[0] ?? trimmedBody,
            timestamp: "Just now",
            unread: false,
            body: paragraphs.length > 0 ? paragraphs : [trimmedBody],
        };

        messages = [nextMessage, ...messages];
        closeCompose();
        toast.positive("Message sent");
    }

    function handleComposeSubmit(event: SubmitEvent): void {
        event.preventDefault();
        sendCompose();
    }

    function handleComposeKeydown(event: KeyboardEvent): void {
        if (event.key === "Escape") {
            event.preventDefault();
            closeCompose();
            return;
        }

        if ((event.ctrlKey || event.metaKey) && event.key === "Enter" && canSendCompose) {
            event.preventDefault();
            sendCompose();
        }
    }

    async function openReply(): Promise<void> {
        isReplyOpen = true;
        await tick();
        replyTextareaRef?.focus();
    }

    function cancelReply(): void {
        isReplyOpen = false;
        replyText = "";
    }

    function sendReply(): void {
        const trimmed = replyText.trim();
        if (!trimmed || !selectedMessage) return;

        const paragraphs = trimmed
            .split(/\n{2,}/)
            .map((part) => part.trim())
            .filter(Boolean);
        const nextReply = {
            id: `reply-${Date.now()}`,
            sender: "Colin",
            timestamp: "Just now",
            body: paragraphs.length > 0 ? paragraphs : [trimmed],
        };

        selectedMessage.replies = [...(selectedMessage.replies ?? []), nextReply];
        isReplyOpen = false;
        replyText = "";
        toast.positive("Reply sent");
    }

    function handleReplyKeydown(event: KeyboardEvent): void {
        if (event.key === "Escape") {
            event.preventDefault();
            cancelReply();
            return;
        }

        if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
            event.preventDefault();
            sendReply();
        }
    }

    function pickFallbackSelection(removedId: string, folder: EmailFolder): string | null {
        return messages.find((message) => message.folder === folder && message.id !== removedId)?.id ?? null;
    }

    function toggleRead(id: string): void {
        const target = messages.find((message) => message.id === id);
        if (!target) return;
        target.unread = !target.unread;
    }

    function archiveMessage(id: string): void {
        const target = messages.find((message) => message.id === id);
        if (!target || target.folder === "archive") return;

        const previousFolder = target.folder;
        const previousSelection = selectedId;

        if (selectedId === id) {
            selectedId = pickFallbackSelection(id, activeFolder);
            isEarlierExpanded = false;
            isReplyOpen = false;
            replyText = "";
        }

        target.folder = "archive";

        toast.base("Message archived", {
            action: {
                label: "Undo",
                onClick: () => {
                    target.folder = previousFolder;
                    if (activeFolder === previousFolder) {
                        selectedId = previousSelection;
                    }
                    toast.positive("Message restored");
                },
            },
        });
    }

    function deleteMessage(id: string): void {
        const index = messages.findIndex((message) => message.id === id);
        if (index === -1) return;

        const removed = messages[index];
        if (!removed) return;

        const previousSelection = selectedId;
        if (selectedId === id) {
            selectedId = pickFallbackSelection(id, activeFolder);
            isEarlierExpanded = false;
            isReplyOpen = false;
            replyText = "";
        }

        messages.splice(index, 1);

        toast.base("Message deleted", {
            action: {
                label: "Undo",
                onClick: () => {
                    messages.splice(index, 0, removed);
                    if (activeFolder === removed.folder) {
                        selectedId = previousSelection;
                    }
                    toast.positive("Message restored");
                },
            },
        });
    }
</script>

<svelte:window onkeydown={handleWindowKeydown} />

<div class="h-full w-full flex gap-3 p-3 bg-canvas overflow-hidden">
    <aside class="w-[210px] shrink-0 flex flex-col pt-2 px-1">
        <Button variant="primary" size="md" class="w-full" onclick={openNewCompose}>
            <ButtonIcon icon={SquarePen} />
            <ButtonLabel>Compose</ButtonLabel>
        </Button>

        <nav aria-label="Mailboxes" class="mt-3 flex flex-col gap-0.5">
            {#each EMAIL_FOLDERS as folder (folder.id)}
                {const Icon = FOLDER_ICONS[folder.id]}
                {const isActive = $derived(activeFolder === folder.id)}
                <button
                    type="button"
                    aria-current={isActive ? "page" : undefined}
                    class={[
                        "w-full text-left px-2.5 py-2 rounded-xl squircle-soft text-sm transition-colors duration-150 flex items-center justify-between gap-2 cursor-default",
                        isActive
                            ? "bg-base-soft-hover text-strong font-500"
                            : "text-main hover:bg-base-soft hover:text-strong",
                    ]}
                    onclick={() => selectFolder(folder.id)}
                >
                    <span class="flex items-center gap-2.5 min-w-0">
                        <Icon class="size-4 shrink-0" strokeWidth={isActive ? 2.25 : 2} />
                        <span class="truncate">{folder.label}</span>
                    </span>

                    {#if folder.id === "inbox" && inboxUnreadCount > 0}
                        <span class="text-xs text-weak tabular-nums">{inboxUnreadCount}</span>
                    {/if}
                </button>
            {/each}
        </nav>
    </aside>

    <section
        aria-label="Messages"
        class="w-[340px] shrink-0 bg-elevated shadow-elevated rounded-3xl squircle flex flex-col min-h-0 overflow-hidden"
    >
        <div class="p-3 pb-2 flex flex-col gap-2 shrink-0">
            <TextInput variant="soft" size="md">
                <TextInputIcon icon={Search} />
                <TextInputField
                    bind:ref={searchInputRef}
                    type="search"
                    placeholder="Search..."
                    aria-label="Search messages"
                    bind:value={query}
                />
                <TextInputAction
                    icon={X}
                    aria-label="Clear search"
                    visible={query.length > 0}
                    onclick={clearSearch}
                />
            </TextInput>

            <SegmentedControl size="sm" width="equal" bind:value={filterMode} aria-label="Filter messages">
                <SegmentedControlItem value="all">
                    <SegmentedControlLabel>All</SegmentedControlLabel>
                </SegmentedControlItem>
                <SegmentedControlItem value="unread">
                    <SegmentedControlLabel>Unread</SegmentedControlLabel>
                </SegmentedControlItem>
            </SegmentedControl>
        </div>

        <ScrollArea size="sm" direction="vertical" class="flex-1 min-h-0">
                <ScrollAreaContent
                    class="px-2 py-2 flex flex-col gap-0.5"
                    {@attach scrollFade({ size: "md", direction: "vertical", edges: "both" })}
                >
                    {#if filteredMessages.length === 0}
                        <p class="py-12 text-center text-sm text-weak">
                            {emptyListLabel}
                        </p>
                    {:else}
                        {#each filteredMessages as msg (msg.id)}
                            {const isSelected = $derived(selectedMessage?.id === msg.id)}
                            <button
                                type="button"
                                aria-current={isSelected ? "true" : undefined}
                                class={[
                                    "w-full text-left px-3 py-2.5 rounded-xl squircle-soft transition-colors duration-150 cursor-default flex flex-col gap-0.5",
                                    isSelected ? "bg-base-soft" : "hover:bg-base-soft/60",
                                ]}
                                onclick={() => selectMessage(msg)}
                            >
                                <div class="flex items-center justify-between gap-2">
                                    <span class="flex items-center gap-1.5 min-w-0">
                                        <span class="w-2.5 shrink-0 flex-center" aria-hidden="true">
                                            {#if msg.unread}
                                                <span class="size-1.5 rounded-full bg-[var(--cs-color-accent-solid)]"></span>
                                            {/if}
                                        </span>
                                        <span
                                            class={[
                                                "text-sm truncate",
                                                msg.unread ? "font-600 text-strong" : "font-500 text-main",
                                            ]}
                                        >
                                            {msg.sender}
                                        </span>
                                    </span>
                                    <span class="text-xs text-weak tabular-nums shrink-0">{msg.timestamp}</span>
                                </div>

                                <div
                                    class={[
                                        "pl-4 text-sm truncate",
                                        msg.unread ? "font-500 text-strong" : "font-400 text-main",
                                    ]}
                                >
                                    {msg.subject}
                                </div>

                                <div class="pl-4 text-xs text-weak truncate">
                                    {msg.preview}
                                </div>
                            </button>
                        {/each}
                    {/if}
                </ScrollAreaContent>
            </ScrollArea>
        </section>

    <main class="flex-1 min-w-0 bg-elevated shadow-elevated rounded-3xl squircle flex flex-col min-h-0 overflow-hidden">
        {#if composeMode !== null}
            <div class="flex-1 min-h-0 flex flex-col" in:fade={{ duration: 150 }}>
                <header class="px-7 pt-6 pb-4 flex items-center justify-between gap-4 shrink-0">
                <h1 class="text-lg font-600 tracking-tight text-strong">
                    {composeMode === "forward" ? "Forward message" : "New message"}
                </h1>
                <Button variant="ghost" size="sm" onclick={closeCompose}>
                    <ButtonLabel>Discard</ButtonLabel>
                </Button>
            </header>

            <form class="flex-1 min-h-0 flex flex-col" onsubmit={handleComposeSubmit}>
                <div class="px-7 flex flex-col gap-2.5 shrink-0">
                    <TextInput variant="soft" size="md">
                        <TextInputField
                            bind:ref={composeToInputRef}
                            type="email"
                            placeholder="Recipient"
                            aria-label="To"
                            bind:value={composeTo}
                        />
                    </TextInput>
                    <TextInput variant="soft" size="md">
                        <TextInputField
                            placeholder="Subject"
                            aria-label="Subject"
                            bind:value={composeSubject}
                        />
                    </TextInput>
                </div>

                <div class="flex-1 min-h-0 px-7 pt-3 pb-2 flex flex-col">
                    <div class="cs-reply-composer flex-1 min-h-0 bg-base-soft rounded-2xl squircle-smooth p-3.5 flex flex-col">
                        <TextArea
                            variant="soft"
                            size="md"
                            rows={8}
                            resize="none"
                            placeholder="Write a message..."
                            aria-label="Message"
                            class="cs-reply-textarea flex-1 min-h-0"
                            bind:value={composeBody}
                            onkeydown={handleComposeKeydown}
                            {@attach autoResize({ minRows: 8 })}
                        />
                    </div>
                </div>

                <div class="px-7 pb-6 pt-3 flex items-center justify-between gap-3 shrink-0">
                    <KbdGroup variant="soft" size="sm" aria-hidden="true">
                        <Kbd symbol="ctrl" />
                        <KbdSeparator />
                        <Kbd symbol="enter" display="text" />
                    </KbdGroup>

                    <div class="flex items-center gap-2">
                        <Button variant="ghost" size="sm" type="button" onclick={closeCompose}>
                            <ButtonLabel>Cancel</ButtonLabel>
                        </Button>
                        <Button
                            variant="primary"
                            size="sm"
                            type="submit"
                            disabled={!canSendCompose}
                        >
                            <ButtonLabel>Send</ButtonLabel>
                        </Button>
                    </div>
                </div>
            </form>
            </div>
        {:else if selectedMessage}
            <div class="flex-1 min-h-0 flex flex-col" in:fade={{ duration: 150 }}>
                <header class="px-7 pt-6 pb-4 shrink-0">
                    <div class="flex items-start justify-between gap-4">
                        <h1 class="text-xl font-600 tracking-tight text-strong leading-snug">
                            {selectedMessage.subject}
                        </h1>

                        <div class="flex items-center gap-1 shrink-0">
                            <Button
                                variant="ghost"
                                size="sm"
                                iconOnly
                                aria-label="Reply"
                                onclick={openReply}
                                {@attach tooltip({ text: "Reply", placement: "bottom" })}
                            >
                                <ButtonIcon icon={Reply} />
                                <HitArea size="md" />
                            </Button>

                            <Button
                                variant="ghost"
                                size="sm"
                                iconOnly
                                aria-label="Archive"
                                disabled={selectedMessage.folder === "archive"}
                                onclick={() => archiveMessage(selectedMessage.id)}
                                {@attach tooltip({ text: "Archive", placement: "bottom" })}
                            >
                                <ButtonIcon icon={Archive} />
                                <HitArea size="md" />
                            </Button>

                            <Dropdown size="sm">
                                <!-- eslint-disable-next-line button/require-tooltip -->
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    iconOnly
                                    aria-label="More actions"
                                    {@attach dropdownTrigger()}
                                >
                                    <ButtonIcon icon={MoreHorizontal} />
                                    <HitArea size="md" />
                                </Button>
                                <DropdownContent placement="bottom-end">
                                    <DropdownItem
                                        icon={selectedMessage.unread ? MailOpen : Mail}
                                        onSelect={() => toggleRead(selectedMessage.id)}
                                    >
                                        {selectedMessage.unread ? "Mark as read" : "Mark as unread"}
                                    </DropdownItem>
                                    {#if selectedMessage.folder !== "archive"}
                                        <DropdownItem
                                            icon={Archive}
                                            onSelect={() => archiveMessage(selectedMessage.id)}
                                        >
                                            Archive
                                        </DropdownItem>
                                    {/if}
                                    <DropdownSeparator />
                                    <DropdownItem
                                        icon={Trash2}
                                        negative
                                        onSelect={() => deleteMessage(selectedMessage.id)}
                                    >
                                        Delete
                                    </DropdownItem>
                                </DropdownContent>
                            </Dropdown>
                        </div>
                    </div>

                    <div class="mt-3 flex items-center gap-3">
                        <div
                            class="size-8 rounded-full bg-base-soft text-strong text-xs font-600 flex-center shrink-0 select-none"
                            aria-hidden="true"
                        >
                            {selectedMessage.initials}
                        </div>

                        <div class="flex-1 min-w-0">
                            <div class="flex items-baseline gap-2 min-w-0">
                                <span class="text-sm font-500 text-strong truncate">{selectedMessage.sender}</span>
                                <span class="text-sm text-weak truncate">{selectedMessage.email}</span>
                            </div>
                            <div class="flex items-baseline justify-between gap-2 mt-0.5">
                                <span class="text-xs text-weak">To: me</span>
                                <span class="text-xs text-weak tabular-nums shrink-0">
                                    {selectedMessage.timestamp}
                                </span>
                            </div>
                        </div>
                    </div>
                </header>

                <ScrollArea size="md" direction="vertical" class="flex-1 min-h-0">
                    <ScrollAreaContent
                        class="px-7 py-4"
                        {@attach scrollFade({ size: "md", direction: "vertical", edges: "both" })}
                    >
                        <article class="max-w-[65ch] flex flex-col gap-4 text-sm leading-relaxed text-main">
                            {#if selectedMessage.earlierMessages && selectedMessage.earlierMessages.length > 0}
                                {const earlierCount = $derived(selectedMessage.earlierMessages.length)}
                                <div class="flex flex-col">
                                    <Button
                                        variant="ghost"
                                        size="xs"
                                        class="self-start text-weak"
                                        aria-expanded={isEarlierExpanded}
                                        onclick={() => (isEarlierExpanded = !isEarlierExpanded)}
                                    >
                                        <HitArea size="md" />
                                        <ButtonIcon
                                            icon={ChevronDown}
                                            class={[
                                                "transition-transform duration-[var(--cs-dur-160)] ease-[var(--cs-ease-quad-out)]",
                                                isEarlierExpanded && "rotate-180",
                                            ]}
                                        />
                                        <ButtonLabel>{earlierCount} earlier {earlierCount === 1 ? "message" : "messages"}</ButtonLabel>
                                    </Button>

                                    <div
                                        class={["cs-email-disclosure", isEarlierExpanded && "is-open"]}
                                        inert={!isEarlierExpanded}
                                    >
                                        <div class="cs-email-disclosure-inner">
                                            <div class="flex flex-col gap-4 pt-3 pb-4 border-b border-base-soft">
                                                {#each selectedMessage.earlierMessages as earlier (earlier.id)}
                                                    <div class="flex flex-col gap-3">
                                                        <div class="flex items-baseline justify-between gap-2">
                                                            <span class="text-sm font-500 text-main">{earlier.sender}</span>
                                                            <span class="text-xs text-weak tabular-nums">{earlier.timestamp}</span>
                                                        </div>
                                                        {#each earlier.body as paragraph, index (index)}
                                                            <p class="text-sm text-weak">{paragraph}</p>
                                                        {/each}
                                                    </div>
                                                {/each}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            {/if}

                            {#each selectedMessage.body as paragraph, index (index)}
                                <p>{paragraph}</p>
                            {/each}

                            {#if selectedMessage.attachments && selectedMessage.attachments.length > 0}
                                <div class="flex flex-wrap gap-2 pt-1">
                                    {#each selectedMessage.attachments as attachment (attachment.name)}
                                        <button
                                            type="button"
                                            class="inline-flex items-center gap-2.5 px-3 py-2 rounded-xl squircle-soft bg-base-soft hover:bg-base-soft-hover transition-colors cursor-default"
                                            onclick={() => toast.base(`Downloading ${attachment.name}`)}
                                        >
                                            <Paperclip class="size-3.5 text-weak shrink-0" aria-hidden="true" />
                                            <span class="text-xs font-500 text-strong">{attachment.name}</span>
                                            <span class="text-xs text-weak tabular-nums">{attachment.size}</span>
                                            <Download class="size-3.5 text-weak shrink-0" aria-hidden="true" />
                                        </button>
                                    {/each}
                                </div>
                            {/if}

                            {#if selectedMessage.replies && selectedMessage.replies.length > 0}
                                {#each selectedMessage.replies as reply (reply.id)}
                                    <div class="border-t border-base-soft pt-5 mt-2 flex flex-col gap-3">
                                        <div class="flex items-baseline justify-between gap-2">
                                            <span class="text-sm font-500 text-strong">{reply.sender}</span>
                                            <span class="text-xs text-weak tabular-nums">{reply.timestamp}</span>
                                        </div>
                                        {#each reply.body as paragraph, index (index)}
                                            <p>{paragraph}</p>
                                        {/each}
                                    </div>
                                {/each}
                            {/if}
                        </article>
                    </ScrollAreaContent>
                </ScrollArea>

                <div class="px-7 pb-6 pt-3 shrink-0">
                    {#if !isReplyOpen}
                        <div class="flex items-center gap-2" in:fade={{ duration: 150, delay: 90 }}>
                            <Button variant="tertiary" size="sm" onclick={openReply}>
                                <ButtonIcon icon={Reply} />
                                <ButtonLabel>Reply</ButtonLabel>
                            </Button>
                            <Button variant="ghost" size="sm" onclick={openForward}>
                                <ButtonIcon icon={Forward} />
                                <ButtonLabel>Forward</ButtonLabel>
                            </Button>
                        </div>
                    {/if}

                    <div
                        class={["cs-email-disclosure", isReplyOpen && "is-open"]}
                        inert={!isReplyOpen}
                    >
                        <div class="cs-email-disclosure-inner">
                            <div class="max-w-[65ch] cs-reply-composer bg-base-soft rounded-2xl squircle-smooth p-3 flex flex-col gap-2">
                                <div class="text-xs text-weak px-0.5">
                                    Replying to {selectedMessage.sender}
                                </div>
                                <TextArea
                                    bind:ref={replyTextareaRef}
                                    variant="soft"
                                    size="md"
                                    rows={2}
                                    resize="none"
                                    placeholder="Write a reply..."
                                    aria-label="Reply"
                                    class="cs-reply-textarea"
                                    bind:value={replyText}
                                    onkeydown={handleReplyKeydown}
                                    {@attach autoResize({ minRows: 2, maxRows: 6 })}
                                />
                                <div class="flex items-center justify-between gap-2 pt-1">
                                    <KbdGroup variant="soft" size="sm" aria-hidden="true">
                                        <Kbd symbol="ctrl" />
                                        <KbdSeparator />
                                        <Kbd symbol="enter" display="text" />
                                    </KbdGroup>
                                    <div class="flex items-center gap-2">
                                        <Button variant="ghost" size="sm" onclick={cancelReply}>
                                            <ButtonLabel>Cancel</ButtonLabel>
                                        </Button>
                                        <Button
                                            variant="primary"
                                            size="sm"
                                            disabled={!replyText.trim()}
                                            onclick={sendReply}
                                        >
                                            <ButtonLabel>Send</ButtonLabel>
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            {:else}
                <div class="flex-1 flex-center text-sm text-weak">
                    Select a message to read
                </div>
            {/if}
    </main>
</div>

<style>
    /* Strip inner TextArea chrome so the outer reply container owns surface & focus ring. */
    :global(.cs-reply-textarea) {
        --cs-text-area-bg: transparent;
        --cs-text-area-bg-hover: transparent;
        --cs-text-area-shadow: none;
        --cs-text-area-shadow-hover: none;
        --cs-text-area-ring-shadow: none;
        --cs-text-area-ring-shadow-hover: none;
        padding: 0;
        border-radius: 0;
    }

    .cs-reply-composer {
        transition: box-shadow var(--cs-dur-120) var(--cs-ease-quart-out);
    }

    .cs-reply-composer:has(:global(.cs-text-area:focus:not(:disabled))) {
        box-shadow: inset 0 0 0 2px var(--cs-color-accent-solid);
    }

    .cs-email-disclosure {
        display: grid;
        grid-template-rows: 0fr;
        opacity: 0;
        transition:
            grid-template-rows var(--cs-dur-exit-sm) var(--cs-ease-exit),
            opacity var(--cs-dur-exit-sm) var(--cs-ease-exit);
    }

    .cs-email-disclosure.is-open {
        grid-template-rows: 1fr;
        opacity: 1;
        transition:
            grid-template-rows var(--cs-dur-enter-sm) var(--cs-ease-enter),
            opacity var(--cs-dur-enter-sm) var(--cs-ease-enter);
    }

    .cs-email-disclosure-inner {
        overflow-x: visible;
        overflow-y: clip;
        min-height: 0;
    }
</style>
