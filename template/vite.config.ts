import path from "node:path";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { csTheme } from "cs/vite";
import UnoCSS from "unocss/vite";
import { defineConfig, type PluginOption } from "vite";
import { createHtmlPlugin } from "vite-plugin-html";

export default defineConfig({
    server: {
        host: true,
        allowedHosts: ["dev.cscripts.dev"],
    },

    plugins: [
        csTheme({ mode: "system" }),
        ...createHtmlPlugin({
            minify: {
                collapseWhitespace: true,
                removeComments: true,
                minifyCSS: true,
                minifyJS: true,
                useShortDoctype: true,
                removeEmptyAttributes: true,
                removeAttributeQuotes: true,
                collapseBooleanAttributes: true,
                removeRedundantAttributes: true,
                removeScriptTypeAttributes: true,
                removeStyleLinkTypeAttributes: true,
            },
        }).map((plugin) =>
            plugin && typeof plugin === "object" && "name" in plugin ? { ...plugin, apply: "build" } : plugin
        ),
        UnoCSS(),
        svelte(),
    ],

    resolve: {
        tsconfigPaths: true,
        alias: {
            $shared: path.resolve(import.meta.dirname, "./src/shared"),
            $core: path.resolve(import.meta.dirname, "./src/core"),
            $features: path.resolve(import.meta.dirname, "./src/features"),
        },
    },

    optimizeDeps: {
        exclude: ["cs"],
    },

    css: {
        transformer: "lightningcss",
    },

    build: {
        minify: "terser",
        terserOptions: {
            ecma: 2020,
            module: true,
            toplevel: true,
            compress: {
                drop_console: true,
                drop_debugger: true,
                passes: 3,
            },
            format: {
                comments: false,
            },
            mangle: true,
        },
    },
});
