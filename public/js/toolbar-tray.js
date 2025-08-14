// /js/toolbar-tray.js
import { setSheet } from "./ui.js";

export function initToolbarTray() {
  const tray = document.getElementById("toolTray");
  if (!tray) return;

  tray.addEventListener("click", (e) => {
    const btn = e.target.closest(".pw-tool");   // ← updated selector
    if (!btn) return;

    const raw = (btn.dataset.cmd || "").toLowerCase();
    const cmd = raw === "buypolistar" ? "swappolistar" : raw;
    window.dispatchEvent(new CustomEvent("pw:run-cmd", { detail: { cmd } }));
    setSheet(false);
  });
}