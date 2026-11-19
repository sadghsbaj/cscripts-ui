export type EmailFolder = "inbox" | "sent" | "drafts" | "archive";

export interface EmailAttachment {
    name: string;
    size: string;
}

export interface EmailEarlierMessage {
    id: string;
    sender: string;
    initials: string;
    timestamp: string;
    body: string[];
}

export interface EmailReply {
    id: string;
    sender: string;
    timestamp: string;
    body: string[];
}

export interface EmailMessage {
    id: string;
    folder: EmailFolder;
    sender: string;
    initials: string;
    email: string;
    subject: string;
    preview: string;
    timestamp: string;
    unread: boolean;
    body: string[];
    attachments?: EmailAttachment[];
    earlierMessages?: EmailEarlierMessage[];
    replies?: EmailReply[];
}

export interface EmailFolderItem {
    id: EmailFolder;
    label: string;
}

export const EMAIL_FOLDERS: readonly EmailFolderItem[] = [
    { id: "inbox", label: "Inbox" },
    { id: "sent", label: "Sent" },
    { id: "drafts", label: "Drafts" },
    { id: "archive", label: "Archive" },
];

const INITIAL_MESSAGES: readonly EmailMessage[] = [
    {
        id: "msg-01",
        folder: "inbox",
        sender: "Hannah Lindqvist",
        initials: "HL",
        email: "hannah@nordicstudio.io",
        subject: "Q2 design token audit notes",
        preview: "Wrapped up the contrast pass on elevated surfaces and disabled states.",
        timestamp: "10:42",
        unread: true,
        earlierMessages: [
            {
                id: "earlier-01",
                sender: "Colin",
                initials: "CK",
                timestamp: "Yesterday",
                body: [
                    "Hi Hannah,",
                    "Could you run a quick contrast pass on the elevated surfaces and disabled form controls before Friday's review? I want to make sure the dark mode card rim feels calm without losing legibility.",
                ],
            },
        ],
        body: [
            "Hi Colin,",
            "I finished the contrast pass across elevated surfaces, soft badges, and disabled form controls this morning. Everything in light mode clears AA comfortably, and dark mode looks much calmer after softening the card rim.",
            "One small item left to review together: the secondary button text weight on dense toolbars. Let me know when you have ten minutes to walk through the diff.",
        ],
    },
    {
        id: "msg-02",
        folder: "inbox",
        sender: "Marcus Weber",
        initials: "MW",
        email: "m.weber@linearwerk.de",
        subject: "Updated floor plan for Studio B",
        preview: "Attached the revised acoustic partition layout ahead of Friday.",
        timestamp: "09:15",
        unread: true,
        attachments: [{ name: "studio-b-acoustic-plan.pdf", size: "2.4 MB" }],
        body: [
            "Morning,",
            "We adjusted the acoustic partition spacing on the east wall so the two editing desks get natural daylight without screen glare in the afternoon.",
            "If the electrical drops look right to you, I will confirm the schedule with the contractor before noon tomorrow.",
        ],
    },
    {
        id: "msg-03",
        folder: "inbox",
        sender: "Clara Moreau",
        initials: "CM",
        email: "clara@atelier-moreau.fr",
        subject: "Typography specimen proof",
        preview: "The tabular figures in the invoice table align cleanly now.",
        timestamp: "Yesterday",
        unread: true,
        body: [
            "Hi Colin,",
            "Thanks for sending the updated specimen build. Enabling tabular numerals across the pricing column resolved the horizontal jitter when toggling between monthly and annual billing.",
            "I also checked the optical alignment of the 14px icons next to medium-weight labels and everything sits right on the baseline.",
        ],
    },
    {
        id: "msg-04",
        folder: "inbox",
        sender: "David Chen",
        initials: "DC",
        email: "dchen@kestrel.systems",
        subject: "Release checklist for v0.9",
        preview: "All integration suites passed on the staging runner.",
        timestamp: "Yesterday",
        unread: false,
        body: [
            "Hey,",
            "The staging runner finished green across all component suites and type checks. Bundle size for the core CSS layer came in slightly under last week's baseline.",
            "Whenever you are ready to tag the release, ping me and I will publish the changelog notes.",
        ],
    },
    {
        id: "msg-05",
        folder: "inbox",
        sender: "Sofia Alvarez",
        initials: "SA",
        email: "sofia@verdearchive.org",
        subject: "Editorial calendar for May",
        preview: "Drafted three case study slots for the engineering blog.",
        timestamp: "May 14",
        unread: false,
        body: [
            "Hi Colin,",
            "Here is the proposed cadence for May. We have space for a deep dive on CSS anchor positioning, a short note on squircle geometry, and a retrospective on our icon stroke calibration.",
            "Feel free to swap the order if any of the implementation demos need an extra week.",
        ],
    },
    {
        id: "msg-06",
        folder: "inbox",
        sender: "Jonas Berg",
        initials: "JB",
        email: "jonas@bergworks.se",
        subject: "Invoice 2026-041 settled",
        preview: "Wire transfer cleared this morning. Receipt attached for your records.",
        timestamp: "May 12",
        unread: false,
        attachments: [{ name: "invoice-2026-041-receipt.pdf", size: "184 KB" }],
        body: [
            "Hi Colin,",
            "Just a quick note to confirm that invoice 2026-041 has cleared on our end. Thank you again for the quick turnaround on the navigation prototype.",
        ],
    },
    {
        id: "msg-07",
        folder: "sent",
        sender: "Colin",
        initials: "CK",
        email: "colin@cscripts.ui",
        subject: "Re: Component API review",
        preview: "Agreed on keeping variant and size explicit without defaults.",
        timestamp: "May 11",
        unread: false,
        body: [
            "Hi Hannah,",
            "Agreed on keeping variant and size explicit at every call site. It makes code reviews much easier to scan and prevents accidental visual drift across screens.",
            "I will update the remaining form primitives to match that convention before the end of the week.",
        ],
    },
    {
        id: "msg-08",
        folder: "sent",
        sender: "Colin",
        initials: "CK",
        email: "colin@cscripts.ui",
        subject: "Hardware order confirmation",
        preview: "Confirmed the 27-inch reference display delivery for Tuesday.",
        timestamp: "May 9",
        unread: false,
        body: [
            "Hi Marcus,",
            "The reference display is confirmed for Tuesday morning delivery at the front desk. Let me know once it is unboxed and calibrated.",
        ],
    },
    {
        id: "msg-09",
        folder: "drafts",
        sender: "Colin",
        initials: "CK",
        email: "colin@cscripts.ui",
        subject: "Notes on scroll fade ergonomics",
        preview: "Keeping fade masks purely CSS-driven avoids main-thread scroll jank.",
        timestamp: "Draft",
        unread: false,
        body: [
            "Key takeaway from this week's testing: driving edge fades with CSS scroll timelines keeps the main thread completely idle while scrolling long message lists.",
            "Need to add a short comparison showing how outer overlay scrollbars stay unmasked when attached to the inner content viewport.",
        ],
    },
    {
        id: "msg-10",
        folder: "archive",
        sender: "Elena Rostova",
        initials: "ER",
        email: "elena@monolith.press",
        subject: "Print proof approval",
        preview: "Signed off on the matte stock sample for the annual booklet.",
        timestamp: "Apr 28",
        unread: false,
        body: [
            "Hi Colin,",
            "The matte uncoated stock sample arrived today and the ink density on the charcoal spreads looks spot on. We have approved the press run.",
        ],
    },
    {
        id: "msg-11",
        folder: "archive",
        sender: "Tomasz Nowak",
        initials: "TN",
        email: "tomasz@fieldnotes.pl",
        subject: "Workshop slides archive",
        preview: "Uploaded the final PDF deck and starter repository link.",
        timestamp: "Apr 21",
        unread: false,
        body: [
            "Hi everyone,",
            "Thanks for joining last week's session. The final slide deck and starter templates are now archived in the shared workspace folder.",
        ],
    },
];

export function createInitialMessages(): EmailMessage[] {
    return INITIAL_MESSAGES.map((message) => ({
        ...message,
        body: [...message.body],
        attachments: message.attachments ? message.attachments.map((att) => ({ ...att })) : undefined,
        earlierMessages: message.earlierMessages
            ? message.earlierMessages.map((earlier) => ({ ...earlier, body: [...earlier.body] }))
            : undefined,
        replies: message.replies ? message.replies.map((reply) => ({ ...reply, body: [...reply.body] })) : undefined,
    }));
}
