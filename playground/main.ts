import { mount } from "svelte";
import "virtual:uno.css";
import App from "./App.svelte";
import "cs/css";

mount(App, { target: document.getElementById("app")! });
