import type { Plugin } from "vite";

export type CSThemeMode = "light" | "dark" | "system";

export interface CSThemeOptions {
    mode?: CSThemeMode;
    lightColor?: string;
    darkColor?: string;
}

export function csTheme(options: CSThemeOptions = {}): Plugin {
    const mode = options.mode ?? "system";
    const light = options.lightColor ?? "#f4f4f5";
    const dark = options.darkColor ?? "#09090b";

    const css = `html{background-color:light-dark(oklch(96.7% 0.001 286.375),oklch(14.1% 0.005 285.823))}`;

    const setMeta = (colorExpr: string) =>
        `let m=document.querySelector('meta[name="theme-color"]');if(!m){m=document.createElement("meta");m.name="theme-color";document.head.appendChild(m)}m.content=${colorExpr}`;

    const script =
        mode === "light" || mode === "dark"
            ? `(()=>{const r=document.documentElement;r.dataset.theme="${mode}";r.style.colorScheme="${mode}";${setMeta(`"${mode === "dark" ? dark : light}"`)}})()`
            : `try{const r=document.documentElement,s=localStorage.getItem("cs-theme"),d=s==="dark"||(s!=="light"&&matchMedia("(prefers-color-scheme:dark)").matches),t=d?"dark":"light";r.dataset.theme=t;r.style.colorScheme=t;${setMeta(`d?"${dark}":"${light}"`)}}catch{}`;

    return {
        name: "vite-plugin-cs-theme",
        transformIndexHtml() {
            return [
                {
                    tag: "style",
                    children: css,
                    injectTo: "head-prepend",
                },
                {
                    tag: "script",
                    children: script,
                    injectTo: "head-prepend",
                },
            ];
        },
    };
}
