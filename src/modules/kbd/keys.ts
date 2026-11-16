import {
    ArrowBigUp,
    ArrowBigUpDash,
    ArrowDown,
    ArrowLeft,
    ArrowLeftToLine,
    ArrowRight,
    ArrowRightToLine,
    ArrowUp,
    ChevronsDown,
    ChevronsUp,
    CornerDownLeft,
    Delete,
} from "@lucide/svelte";
import type { Component } from "svelte";
import type { SVGAttributes } from "svelte/elements";

import { t } from "../../shared/lang.internal.ts";

export type KbdIconComponentProps = Omit<SVGAttributes<SVGSVGElement>, "children" | "color"> &
    Record<string, unknown> & {
        color?: string;
    };

export interface KbdKeyDefinition {
    readonly text: string;
    readonly title: string;
    readonly icon?: Component<KbdIconComponentProps>;
}

export const KBD_KEYS = {
    ctrl: { text: t({ de: "Strg", en: "Ctrl" }), title: t({ de: "Steuerung", en: "Control" }) },
    control: { text: t({ de: "Strg", en: "Ctrl" }), title: t({ de: "Steuerung", en: "Control" }) },
    alt: { text: "Alt", title: "Alt" },
    shift: { text: t({ de: "Umschalt", en: "Shift" }), title: t({ de: "Umschalttaste", en: "Shift" }), icon: ArrowBigUp },
    capslock: {
        text: t({ de: "Feststell", en: "Caps" }),
        title: t({ de: "Feststelltaste", en: "Caps Lock" }),
        icon: ArrowBigUpDash,
    },
    caps: {
        text: t({ de: "Feststell", en: "Caps" }),
        title: t({ de: "Feststelltaste", en: "Caps Lock" }),
        icon: ArrowBigUpDash,
    },
    super: { text: "Super", title: "Super" },
    win: { text: "Win", title: "Windows" },
    meta: { text: "Meta", title: "Meta" },
    arrowup: { text: t({ de: "Hoch", en: "Up" }), title: t({ de: "Pfeil nach oben", en: "Up Arrow" }), icon: ArrowUp },
    up: { text: t({ de: "Hoch", en: "Up" }), title: t({ de: "Pfeil nach oben", en: "Up Arrow" }), icon: ArrowUp },
    arrowdown: {
        text: t({ de: "Runter", en: "Down" }),
        title: t({ de: "Pfeil nach unten", en: "Down Arrow" }),
        icon: ArrowDown,
    },
    down: {
        text: t({ de: "Runter", en: "Down" }),
        title: t({ de: "Pfeil nach unten", en: "Down Arrow" }),
        icon: ArrowDown,
    },
    arrowleft: {
        text: t({ de: "Links", en: "Left" }),
        title: t({ de: "Pfeil nach links", en: "Left Arrow" }),
        icon: ArrowLeft,
    },
    left: {
        text: t({ de: "Links", en: "Left" }),
        title: t({ de: "Pfeil nach links", en: "Left Arrow" }),
        icon: ArrowLeft,
    },
    arrowright: {
        text: t({ de: "Rechts", en: "Right" }),
        title: t({ de: "Pfeil nach rechts", en: "Right Arrow" }),
        icon: ArrowRight,
    },
    right: {
        text: t({ de: "Rechts", en: "Right" }),
        title: t({ de: "Pfeil nach rechts", en: "Right Arrow" }),
        icon: ArrowRight,
    },
    pageup: { text: t({ de: "Bild↑", en: "PgUp" }), title: t({ de: "Bild auf", en: "Page Up" }), icon: ChevronsUp },
    pgup: { text: t({ de: "Bild↑", en: "PgUp" }), title: t({ de: "Bild auf", en: "Page Up" }), icon: ChevronsUp },
    pagedown: {
        text: t({ de: "Bild↓", en: "PgDn" }),
        title: t({ de: "Bild ab", en: "Page Down" }),
        icon: ChevronsDown,
    },
    pgdn: {
        text: t({ de: "Bild↓", en: "PgDn" }),
        title: t({ de: "Bild ab", en: "Page Down" }),
        icon: ChevronsDown,
    },
    home: { text: t({ de: "Pos1", en: "Home" }), title: t({ de: "Pos1", en: "Home" }) },
    end: { text: t({ de: "Ende", en: "End" }), title: t({ de: "Ende", en: "End" }) },
    enter: { text: "Enter", title: "Enter", icon: CornerDownLeft },
    backspace: {
        text: t({ de: "Rücktaste", en: "Backspace" }),
        title: t({ de: "Rücktaste", en: "Backspace" }),
        icon: Delete,
    },
    delete: { text: t({ de: "Entf", en: "Del" }), title: t({ de: "Entfernen", en: "Delete" }) },
    del: { text: t({ de: "Entf", en: "Del" }), title: t({ de: "Entfernen", en: "Delete" }) },
    tab: { text: "Tab", title: "Tab", icon: ArrowRightToLine },
    backtab: { text: "Backtab", title: "Backtab", icon: ArrowLeftToLine },
    shifttab: { text: "Backtab", title: "Backtab", icon: ArrowLeftToLine },
    space: { text: t({ de: "Leertaste", en: "Space" }), title: t({ de: "Leertaste", en: "Space" }) },
    spacebar: { text: t({ de: "Leertaste", en: "Space" }), title: t({ de: "Leertaste", en: "Space" }) },
    fn: { text: "Fn", title: t({ de: "Funktion", en: "Function" }) },
    escape: { text: "Esc", title: "Escape" },
    esc: { text: "Esc", title: "Escape" },
    insert: { text: t({ de: "Einfg", en: "Ins" }), title: t({ de: "Einfügen", en: "Insert" }) },
    ins: { text: t({ de: "Einfg", en: "Ins" }), title: t({ de: "Einfügen", en: "Insert" }) },
    printscreen: { text: t({ de: "Druck", en: "PrtSc" }), title: t({ de: "Druck", en: "Print Screen" }) },
    prtsc: { text: t({ de: "Druck", en: "PrtSc" }), title: t({ de: "Druck", en: "Print Screen" }) },
    prtscn: { text: t({ de: "Druck", en: "PrtSc" }), title: t({ de: "Druck", en: "Print Screen" }) },
    scrolllock: { text: t({ de: "Rollen", en: "ScrLk" }), title: t({ de: "Rollen", en: "Scroll Lock" }) },
    scrlk: { text: t({ de: "Rollen", en: "ScrLk" }), title: t({ de: "Rollen", en: "Scroll Lock" }) },
    break: { text: "Pause", title: t({ de: "Pause / Untbr", en: "Pause / Break" }) },
    pausebreak: { text: "Pause", title: t({ de: "Pause / Untbr", en: "Pause / Break" }) },
    numlock: { text: "Num", title: t({ de: "Num-Taste", en: "Num Lock" }) },
    num: { text: "Num", title: t({ de: "Num-Taste", en: "Num Lock" }) },
    menu: { text: t({ de: "Menü", en: "Menu" }), title: t({ de: "Kontextmenü", en: "Context Menu" }) },
    contextmenu: { text: t({ de: "Menü", en: "Menu" }), title: t({ de: "Kontextmenü", en: "Context Menu" }) },
    apps: { text: t({ de: "Menü", en: "Menu" }), title: t({ de: "Kontextmenü", en: "Context Menu" }) },
    volup: { text: t({ de: "Laut+", en: "Vol+" }), title: t({ de: "Lauter", en: "Volume Up" }) },
    volumeup: { text: t({ de: "Laut+", en: "Vol+" }), title: t({ de: "Lauter", en: "Volume Up" }) },
    voldown: { text: t({ de: "Laut−", en: "Vol−" }), title: t({ de: "Leiser", en: "Volume Down" }) },
    volumedown: { text: t({ de: "Laut−", en: "Vol−" }), title: t({ de: "Leiser", en: "Volume Down" }) },
    mute: { text: t({ de: "Stumm", en: "Mute" }), title: t({ de: "Stummschalten", en: "Mute" }) },
    volumemute: { text: t({ de: "Stumm", en: "Mute" }), title: t({ de: "Stummschalten", en: "Mute" }) },
    play: { text: "Play", title: "Play" },
    pause: { text: "Pause", title: "Pause" },
    brightnessup: { text: t({ de: "Hell+", en: "Bright+" }), title: t({ de: "Heller", en: "Brightness Up" }) },
    sun: { text: t({ de: "Hell+", en: "Bright+" }), title: t({ de: "Heller", en: "Brightness Up" }) },
    brightnessdown: { text: t({ de: "Hell−", en: "Bright−" }), title: t({ de: "Dunkler", en: "Brightness Down" }) },
    moon: { text: t({ de: "Hell−", en: "Bright−" }), title: t({ de: "Dunkler", en: "Brightness Down" }) },
    mic: { text: t({ de: "Mikro", en: "Mic" }), title: t({ de: "Mikrofon", en: "Microphone" }) },
    microphone: { text: t({ de: "Mikro", en: "Mic" }), title: t({ de: "Mikrofon", en: "Microphone" }) },
    power: { text: "Power", title: "Power" },
    search: { text: t({ de: "Suchen", en: "Search" }), title: t({ de: "Suchen", en: "Search" }) },
    find: { text: t({ de: "Suchen", en: "Search" }), title: t({ de: "Suchen", en: "Search" }) },
    undo: { text: t({ de: "Rückgängig", en: "Undo" }), title: t({ de: "Rückgängig", en: "Undo" }) },
    redo: { text: t({ de: "Wiederholen", en: "Redo" }), title: t({ de: "Wiederholen", en: "Redo" }) },
} as const satisfies Record<string, KbdKeyDefinition>;

export type KbdKey = keyof typeof KBD_KEYS;
