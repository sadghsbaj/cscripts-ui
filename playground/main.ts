// Must be imported first to establish the `@layer foundation, components` cascade order before component styles load.
import "cs/css";
import "cs/svelte/theme";

import { mount } from "svelte";
import { configureStoragePrefix } from "cs/svelte/browser-storage";

import "virtual:uno.css";

import App from "./App.svelte";

// Local `file://` HTML apps in Chromium/Edge share a single browser storage bucket;
// set a unique prefix per app so keys never collide across local tools.
configureStoragePrefix("cs-playground");

const target = document.getElementById("app");
if (!target) throw new Error("Missing #app mount target");

mount(App, { target });
