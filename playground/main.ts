import { mount } from "svelte";
import "virtual:uno.css";
import App from "./App.svelte";

mount(App, { target: document.getElementById("app")! });
