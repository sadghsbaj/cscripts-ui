import { mount } from "svelte";

import "virtual:uno.css";

import App from "./App.svelte";

import "cs/css";

const target = document.getElementById("app");
if (!target) throw new Error("Missing #app mount target");

mount(App, { target });
