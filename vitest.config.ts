import { svelte } from "@sveltejs/vite-plugin-svelte";
import { defineConfig } from "vitest/config";

export default defineConfig({
    plugins: [svelte()],
    test: {
        environment: "happy-dom",
        include: ["src/**/*.test.ts"],
        restoreMocks: true,
    },
});
