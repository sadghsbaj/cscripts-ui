import { svelte } from "@sveltejs/vite-plugin-svelte";
import { csFont, csLucide, csTheme } from "cs/vite";
import UnoCSS from "unocss/vite";
import { defineConfig } from "vite";

export default defineConfig({
    server: {
        host: true,
        // Erlaubt alle Hosts, ideal für wechselnde Tunnel-Domains wie bei Cloudflare
        allowedHosts: true,
    },
    plugins: [csTheme({ mode: "system" }), csFont({ sans: "inter" }), csLucide({ enabled: true }), UnoCSS(), svelte()],
});
