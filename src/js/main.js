"use strict";

import { App } from "./app.js";
import { UI } from "./ui.js";
import { Learn } from "./learn.js";
import { Notes } from "./notes.js";
import { Combo } from "./combo.js";

window.App = App;
window.UI = UI;
window.Learn = Learn;
window.Notes = Notes;
window.Combo = Combo;

document.addEventListener("DOMContentLoaded", () => {
  UI.applyTheme(UI.getStoredTheme());
  App.init();
  Learn.init(); // crée window._pomo — doit rester avant Notes.init
  Notes.init();
  Combo.init();
});
