// Must be imported first to establish the `@layer foundation, components` cascade order before component styles load.
import "cs/css";
import "cs/svelte/theme";

import { mount } from "svelte";
import { configureStoragePrefix } from "cs/svelte/browser-storage";

import "virtual:uno.css";

// Local `file://` HTML apps in Chromium/Edge share a single browser storage bucket;
// set a unique non-empty prefix per app (e.g. "holzanalysen") so keys never collide across local tools.
configureStoragePrefix("");

const target = document.getElementById("app");
if (!target) throw new Error("Missing #app mount target");

const isLab = import.meta.env.DEV && window.location.pathname.startsWith("/lab");
const Root = isLab ? (await import("./lab/LabView.svelte")).default : (await import("./App.svelte")).default;

const app = mount(Root, { target });

export default app;
