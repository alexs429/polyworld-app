// /js/toolbar.js
function dispatchRun(cmd) {
  window.dispatchEvent(new CustomEvent("pw:run-cmd", { detail: { cmd } }));
}

export function initToolbar() {
  const q = (id) => document.getElementById(id);

  q("tbMetaMask")?.addEventListener("click", () => {
    window.dispatchEvent(new CustomEvent("pw:connect-metamask"));
  });

  // Open the swap/actions; chat.js will handle the commands
  q("tbBuyPoli")?.addEventListener("click",       () => dispatchRun("buypoli"));
  q("tbBuyPolistar")?.addEventListener("click",   () => dispatchRun("buypolistar"));   // mapped below
  q("tbTransferPolistar")?.addEventListener("click", () => dispatchRun("transferpolistar"));
  q("tbEmbers")?.addEventListener("click",        () => dispatchRun("showembers"));
}
