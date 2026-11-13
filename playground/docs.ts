// Must be imported first to establish the `@layer foundation, components` cascade order before component styles load.
import "cs/css";
import "cs/svelte/theme";

import { mount } from "svelte";
import { configureStoragePrefix } from "cs/svelte/browser-storage";

import "virtual:uno.css";

import PreviewView from "./previews/PreviewView.svelte";

configureStoragePrefix("cs-docs");

const target = document.getElementById("app");
if (!target) throw new Error("Missing #app mount target");

mount(PreviewView, { target });
