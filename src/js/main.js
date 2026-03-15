"use strict";

import { App } from "./app.js";
import { UI } from "./ui.js";

window.App = App;
window.UI = UI;

document.addEventListener("DOMContentLoaded", () => {
  UI.applyTheme(UI.getStoredTheme());
  App.init();
});
