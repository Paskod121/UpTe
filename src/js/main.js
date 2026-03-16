"use strict";

import { App } from "./app.js";
import { UI } from "./ui.js";
import { Learn } from "./learn.js";
import { Notes } from "./notes.js";

window.App = App;
window.UI = UI;
window.Learn = Learn;
window.Notes = Notes;

document.addEventListener("DOMContentLoaded", () => {
  UI.applyTheme(UI.getStoredTheme());
  App.init();
  Learn.init();
  Notes.init();
});
