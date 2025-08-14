import { ENDPOINTS } from "./config.js";
import { typeStatusMessage } from "./ui.js";

// helper
const toNum = (v) => (v == null || v === "" ? 0 : Number(v));

export async function getPolistarBalance(uid) {
  const res = await fetch(ENDPOINTS.getPolistarBalance, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ uid }),
  });
  if (!res.ok) throw new Error("Failed to fetch POLISTAR balance");
  const data = await res.json(); // may be strings
  return {
    ...data,
    balance: toNum(data.balance),
    withdrawable: toNum(data.withdrawable),
    pending: toNum(data.pending),
  };
}

export async function getPoliBalance(address) {
  const res = await fetch(ENDPOINTS.getPoliBalance, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ address }),
  });
  if (!res.ok) throw new Error("Failed to fetch POLI balance");
  const data = await res.json();
  return toNum(data.amount); // already number in one line
}

export async function getUsdtBalance(address) {
  const res = await fetch(ENDPOINTS.getUsdtBalance, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ address }),
  });
  if (!res.ok) throw new Error("Failed to fetch USDT balance");
  const data = await res.json();
  return toNum(data.amount);
}
export function updateBalanceDisplay(balance, withdrawable) {
  poliAmount;
  const a = document.getElementById("balPolistar");
  if (a)
    a.textContent = Number(balance || 0).toLocaleString(undefined, {
      maximumFractionDigits: 4,
    });

  const c = document.getElementById("poliAmount");
  if (c)
    c.textContent = Number(balance || 0).toLocaleString(undefined, {
      maximumFractionDigits: 4,
    });

  const w = document.getElementById("withdrawableBalance");
  if (w)
    w.textContent = Number(withdrawable || 0).toLocaleString(undefined, {
      maximumFractionDigits: 4,
    });
}

export async function displayOnchainBalance() {
  const addr = window.currentWalletAddress;
  if (!addr) return;
  try {
    const [poli, usdt] = await Promise.all([
      getPoliBalance(addr),
      getUsdtBalance(addr).catch(() => 0),
    ]);
    const poliTxt = Number(poli).toLocaleString(undefined, {
      maximumFractionDigits: 4,
    });
    const usdtTxt = Number(usdt).toLocaleString(undefined, {
      maximumFractionDigits: 4,
    });

    const elPoli = document.getElementById("balPoli");
    if (elPoli) elPoli.textContent = poliTxt;

    const elUsdt = document.getElementById("balUsdt");
    if (elUsdt) elUsdt.textContent = usdtTxt;
  } catch (e) {
    console.error(e);
    typeStatusMessage("⚠️ Could not load on-chain balances right now.");
  }
}

export async function displayPolistarBalance(firstTime = false) {
  const addr = window.currentWalletAddress;
  if (!addr) return;
  try {
    const ps = await getPolistarBalance(addr);
    const bal = Number(ps.balance || 0);
    updateBalanceDisplay(bal, ps.withdrawable);
    if (firstTime) {
      if (bal === 0) {
        typeStatusMessage("✨ Polistar is preparing your gift…");
        if (typeof window.startPolistarTimers === "function")
          window.startPolistarTimers();
      } else {
        typeStatusMessage("✨ Your balance has been restored.");
      }
    }
    return ps;
  } catch (e) {
    console.error(e);
    typeStatusMessage("⚠️ Could not load POLISTAR balance right now.");
  }
}

export async function mintPolistarReward(uid, address, amount) {
  if (!uid || !address || !amount) return false;
  try {
    await fetch(ENDPOINTS.rewardPolistar, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ uid, address, amount }),
    });
    const el = document.getElementById("balPolistar");
    if (el) el.textContent = parseInt(el.textContent || "0") + amount;
    return true;
  } catch (e) {
    console.error("Minting failed:", e);
    return false;
  }
}

export async function burnPolistarToken(
  userId,
  amount = 1,
  reason = "Ember session"
) {
  if (!userId) throw new Error("Missing userId for burn");
  const res = await fetch(ENDPOINTS.burnToken, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, tokenId: "POLISTAR", amount, reason }),
  });
  if (!res.ok) throw new Error("Burn failed");
  return res.json().catch(() => ({})); // return backend payload if any
}
