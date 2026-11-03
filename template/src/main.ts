// Must be imported first to establish the `@layer foundation, components` cascade order before component styles load.
import "cs/css";
import "cs/svelte";

import { mount } from "svelte";

import "virtual:uno.css";

import App from "./App.svelte";

const target = document.getElementById("app");
if (!target) throw new Error("Missing #app mount target");

const app = mount(App, { target });

export default app;
