import path from "node:path";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { defineConfig } from "vitest/config";

export default defineConfig({
    plugins: [svelte()],
    resolve: {
        conditions: ["browser"],
        alias: {
            $shared: path.resolve(import.meta.dirname, "./src/shared"),
            $core: path.resolve(import.meta.dirname, "./src/core"),
            $features: path.resolve(import.meta.dirname, "./src/features"),
        },
    },
    test: {
        css: true,
        environment: "happy-dom",
        include: ["src/**/*.test.ts"],
        restoreMocks: true,
    },
});
