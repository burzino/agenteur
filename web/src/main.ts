import { mount } from "svelte";
import "./ui/tema.css";
import App from "./App.svelte";
import { applicaTema, leggiTema } from "./ui/tema";

applicaTema(leggiTema());

const bersaglio = document.getElementById("app");
if (!bersaglio) throw new Error("Elemento #app mancante");

export default mount(App, { target: bersaglio });
