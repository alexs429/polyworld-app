// chat.js
import { els, addMsg, setSheet, typeStatusMessage, flipToBack } from "./ui.js";
import {
  displayOnchainBalance,
  displayPolistarBalance,
  getPolistarBalance,
  mintPolistarReward,
  burnPolistarToken,
} from "./balances.js";
import {
  showUserAddress,
  clearUserAddress,
  loadExistingUser,
  mergeSessions,
} from "./wallet.js";
import { ENDPOINTS, DEV } from "./config.js";
import { speakWithPolistar, speakWithEmber } from "./speech.js";
import {
  showEmberPanel,
  onEmberSelected,
  setActiveEmberUI,
  restorePolistarUI,
} from "./embers.js";

let hasOfferedEmber = false;
let currentSpeaker = "polistar";
let currentEmber = null;
let emberBurnInterval = null;
let firstResponseSent = false;
let _burnHooksBound = false;
// Conversational action state
let action = { mode: null, step: 0, payload: {}, prevPlaceholder: "" };

function setPromptHint(txt) {
  const ta = els.prompt();
  if (!ta) return;
  if (!action.prevPlaceholder) action.prevPlaceholder = ta.placeholder || "";
  ta.placeholder = txt || action.prevPlaceholder;
}

function resetPromptHint() {
  const ta = els.prompt();
  if (!ta) return;
  ta.placeholder = action.prevPlaceholder || "Type your message…";
  action.prevPlaceholder = "";
}

// robust numeric parsing (grabs first decimal number from text)
function parseAmount(s) {
  const m = String(s)
    .replace(",", ".")
    .match(/[-+]?\d*\.?\d+/);
  return m ? parseFloat(m[0]) : NaN;
}

async function fetchPolistarRate() {
  // Prefer explicit dev override
  if (Number.isFinite(DEV?.POLISTAR_PER_POLI)) return DEV.POLISTAR_PER_POLI;

  if (!ENDPOINTS.getPolistarRate) return 1.0; // safe default 1:1
  try {
    const res = await fetch(ENDPOINTS.getPolistarRate, { method: "GET" });
    const data = await res.json();
    const n = Number(data?.polistarPerPoli);
    if (isFinite(n) && n > 0) return n;
    throw new Error("bad rate");
  } catch {
    return 1.0;
  }
}
async function fetchPoliRate() {
  // Prefer explicit dev override
  if (Number.isFinite(DEV?.POLI_PER_USDT)) return DEV.POLI_PER_USDT;

  // No endpoint? avoid fetch/console noise
  if (!ENDPOINTS.getPoliRate) return 10.0;

  try {
    const res = await fetch(ENDPOINTS.getPoliRate, { method: "GET" });
    const data = await res.json();
    const n = Number(data?.poliPerUsdt);
    if (isFinite(n) && n > 0) return n;
    throw new Error("bad rate");
  } catch {
    return 10.0; // safe default
  }
}

async function postJSON(url, payload) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Request failed ${res.status}`);
  return res.json().catch(() => ({}));
}

async function startTransferPolistarFlow() {
  if (!window.currentTravellerId && !window.currentWalletAddress) {
    typeStatusMessage("Please connect MetaMask first.");
    return;
  }
  action = {
    mode: "transferpolistar",
    step: 1,
    payload: {},
    prevPlaceholder: "",
  };

  addMsg("assistant", "Who would you like to send POLISTAR to?");
  typeStatusMessage("Enter the recipient ID (wallet address or user ID).");
  setPromptHint("Recipient (0x… or user ID)");
}

async function confirmTransferRecipient(recipientRaw) {
  const recipient = String(recipientRaw).trim();
  if (!recipient) {
    typeStatusMessage("Please enter a valid recipient or type CANCEL.");
    setPromptHint("Recipient (0x… or user ID)");
    return;
  }
  action.payload.recipient = recipient;
  action.step = 2;

  addMsg("assistant", `Recipient set to ${prettyRecipient(recipient)}.`);

  typeStatusMessage("How many POLISTAR do you want to transfer?");
  setPromptHint("Amount (e.g., 5)");
}

async function confirmTransferAmount(amountRaw) {
  const amt = parseAmount(amountRaw);
  if (!isFinite(amt) || amt <= 0) {
    typeStatusMessage("Please enter a valid amount (e.g., 5) or type CANCEL.");
    setPromptHint("Amount (e.g., 5)");
    return;
  }
  action.payload.amount = amt;
  action.step = 3;

  const to = prettyRecipient(action.payload.recipient);
  addMsg(
    "assistant",
    `You are about to transfer ${amt} POLISTAR to ${to}.\n` +
      `Type YES to continue, or CANCEL to abort.`
  );
  typeStatusMessage("Type YES to continue, or CANCEL to abort.");
  setPromptHint("Type YES to continue");
}

async function executeTransferPolistar() {
  const fromUserId = window.currentTravellerId || window.currentWalletAddress;
  const toUserId = action.payload.recipient;
  const amount = action.payload.amount;
  const simulate =
    DEV?.SIMULATE_TRANSFER_POLISTAR || !ENDPOINTS.transferPolistar;

  try {
    typeStatusMessage("Submitting transfer…");

    if (!simulate) {
      const res = await fetch(ENDPOINTS.transferPolistar, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fromUserId, toUserId, amount }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || "Transfer failed");
    } else {
      await new Promise((r) => setTimeout(r, 800)); // demo delay
    }

    addMsg(
      "assistant",
      `✅ Sent ${amount} POLISTAR to ${prettyRecipient(toUserId)}${
        simulate ? " (simulated)" : ""
      }.`
    );
    typeStatusMessage("Transfer complete. Updating balances…");
    await displayPolistarBalance(); // refresh POLISTAR panel
    endAction();
  } catch (err) {
    console.error("transferPolistar failed:", err);
    typeStatusMessage("Transfer failed. Please try again.");
    addMsg(
      "assistant",
      `❌ Transfer failed: ${err.message || "Unknown error"}`
    );
  }
}

async function startSwapPolistarFlow() {
  if (!window.currentWalletAddress) {
    typeStatusMessage("Please connect MetaMask first.");
    return;
  }

  action = { mode: "swappolistar", step: 1, payload: {}, prevPlaceholder: "" };

  const rate = await fetchPolistarRate();
  action.payload.rate = rate;

  addMsg(
    "assistant",
    `Current rate is ${rate} POLISTAR per 1 POLI.\n` +
      `For example, 10 POLI → ${(10 * rate).toFixed(2)} POLISTAR.`
  );
  typeStatusMessage("Please enter POLI amount to swap to POLISTAR.");
  setPromptHint("Enter POLI amount (e.g., 10)");
}

async function confirmSwapPolistar(poliAmount) {
  const rate = action.payload.rate || (await fetchPolistarRate());
  const polistar = poliAmount * rate;

  action.step = 2;
  action.payload.poli = poliAmount;
  action.payload.polistar = polistar;

  addMsg(
    "assistant",
    `You are about to swap ${poliAmount} POLI for ${polistar.toFixed(
      2
    )} POLISTAR.\n` +
      `Please type YES to continue, or CANCEL to abort.`
  );
  typeStatusMessage("Type YES to continue, or CANCEL to abort.");
  setPromptHint("Type YES to continue");
}
async function executeSwapPolistar() {
  // inputs computed during confirm step
  const poli = action.payload.poli; // amount user typed (POLI)
  const polistar = action.payload.polistar; // previewed POLISTAR to receive
  const userId = window.currentTravellerId || window.currentWalletAddress;

  try {
    typeStatusMessage("Preparing swap…");
    addMsg("assistant", "Bridging POLI → POLISTAR…");

    // Call your existing CF
    const res = await fetch(ENDPOINTS.bridgeToken, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId,
        tokenId: "POLISTAR", // target asset in your previous code
        amount: parseAmount(poli.toString()), // amount in POLI (matches your old pattern)
        toAsset: "POLI",
        bridgeDirection: "fromEVM",
      }),
    });

    const result = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = result?.error || "Bridge failed";
      throw new Error(msg);
    }

    // (your old snippet delayed here)
    await new Promise((r) => setTimeout(r, 3000));

    addMsg(
      "assistant",
      `✅ Swapped ${poli} POLI → ${polistar.toFixed(2)} POLISTAR.`
    );
    typeStatusMessage("Swap complete. Updating balances…");

    await displayOnchainBalance();
    await displayPolistarBalance();

    endAction();
  } catch (err) {
    console.error("swapPolistar failed:", err);
    if (err?.code === 4001) {
      typeStatusMessage("Operation cancelled.");
      addMsg(
        "assistant",
        "❌ You cancelled the operation. Type CANCEL to abort or try again."
      );
      return;
    }
    typeStatusMessage("Swap failed. Please try again.");
    addMsg("assistant", `❌ Swap failed: ${err.message || "Unknown error"}`);
  }
}

async function startBuyPoliFlow() {
  // preconditions
  if (!window.currentWalletAddress) {
    typeStatusMessage("Please connect MetaMask first.");
    return;
  }

  action = { mode: "buypoli", step: 1, payload: {}, prevPlaceholder: "" };

  // get rate & prime UX
  const rate = await fetchPoliRate();
  action.payload.rate = rate;

  addMsg(
    "assistant",
    `Current exchange rate is ${rate} POLI per 1 USDT.\n` +
      `For example, 10 USDT → ${(10 * rate).toFixed(2)} POLI.`
  );
  typeStatusMessage("Please enter USDT amount to purchase POLI.");
  setPromptHint("Enter USDT amount (e.g., 10)");
}

async function confirmBuyPoli(usdt) {
  const rate = action.payload.rate || (await fetchPoliRate());
  const poli = usdt * rate;

  action.step = 2;
  action.payload.usdt = usdt;
  action.payload.poli = poli;

  addMsg(
    "assistant",
    `You are about to purchase ${poli.toFixed(2)} POLI using ${usdt} USDT.\n` +
      `Your MetaMask signature is required; a network fee may apply.\n` +
      `Please type YES to continue, or CANCEL to abort.`
  );
  typeStatusMessage("Type YES to continue, or CANCEL to abort.");
  setPromptHint("Type YES to continue");
}

function isHexAddr(s) {
  return /^0x[a-fA-F0-9]{40}$/.test(String(s).trim());
}
function prettyRecipient(id) {
  if (isHexAddr(id)) return `${id.slice(0, 6)}…${id.slice(-4)}`;
  return id;
}
// Get signer/provider from MetaMask, ensure account is available
// --- MetaMask + ethers helper (add to chat.js) ---
function getSignerAndProvider() {
  // ethers is loaded from the CDN (UMD). Use the global safely.
  const E =
    typeof window !== "undefined" && window.ethers ? window.ethers : null;
  if (!window.ethereum) throw new Error("MetaMask not available");
  if (!E) throw new Error("ethers library not loaded");

  const provider = new E.providers.Web3Provider(window.ethereum, "any");
  // ensure account access (no-op if already granted)
  return provider.send("eth_requestAccounts", []).then(() => {
    const signer = provider.getSigner();
    return signer.getAddress().then((addr) => ({
      provider,
      signer,
      from: String(addr).toLowerCase(),
    }));
  });
}

async function executeBuyPoli() {
  const usdt = action.payload.usdt; // number from earlier step
  const poli = action.payload.poli;
  const uiAddr = window.currentWalletAddress || "";
  const usdtAmount = Math.floor(usdt * 1e6);

  if (!ENDPOINTS.buildApproveUsdtTx) {
    typeStatusMessage("Cannot proceed: approve endpoint not configured.");
    addMsg(
      "assistant",
      "❕ USDT approval step is missing (buildApproveUsdtTx). Please set it in config."
    );
    return;
  }

  try {
    typeStatusMessage("Preparing transaction…");
    addMsg("assistant", "Submitting transaction for signature…");

    // 1) get signer/provider from MetaMask
    const { provider, signer, from } = await getSignerAndProvider();
    const travellerAddress = uiAddr || from;
    console.log("Current User Address:", travellerAddress);
    // 2) APPROVE USDT (if backend decides it's needed)
    try {
      const approvePayload = {
        travellerAddress,
        amount: usdtAmount.toString(), // backend expects string
      };

      const approveRes = await fetch(ENDPOINTS.buildApproveUsdtTx, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(approvePayload),
      });

      // If backend returns 204/skip or empty, just continue
      if (approveRes.ok && approveRes.status !== 204) {
        const approveTx = await approveRes.json(); // raw tx fields
        if (approveTx && approveTx.to) {
          typeStatusMessage("Approving USDT spend…");
          const sent = await signer.sendTransaction(approveTx);
          await provider.waitForTransaction(sent.hash, 1, 60_000);
          addMsg("assistant", "✅ USDT approved.");
        }
      }
    } catch (e) {
      // many backends skip approve when allowance is enough—treat non-2xx as “skip”
      console.debug("Approve step skipped or failed softly:", e);
    }

    // 3) BUILD + SEND buyPoliFromUsdt tx
    const buyRes = await fetch(ENDPOINTS.buyPoli, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        travellerAddress,
        usdtAmount: usdtAmount.toString(),
      }),
    });
    if (!buyRes.ok) throw new Error("Failed to prepare POLI purchase");
    const buyTx = await buyRes.json();

    typeStatusMessage("💸 Swapping USDT for POLI…");
    const tx = await signer.sendTransaction(buyTx);
    await provider.waitForTransaction(tx.hash, 1, 60_000);

    // 4) Success UI + refresh
    addMsg(
      "assistant",
      `✅ Purchased ${poli.toFixed(2)} POLI with ${usdt} USDT.`
    );
    typeStatusMessage("✅ POLI successfully received. Updating balances…");
    await displayOnchainBalance();

    endAction();
  } catch (err) {
    // common MetaMask reject code
    if (err?.code === 4001) {
      typeStatusMessage("Transaction rejected in MetaMask.");
      addMsg(
        "assistant",
        "❌ You rejected the transaction. Type CANCEL to abort or try again."
      );
      return; // keep action active on step 2
    }
    console.error("buyPoli failed:", err);
    typeStatusMessage("Purchase failed. Please try again.");
    addMsg("assistant", "❌ Purchase failed. You can type CANCEL to abort.");
    // keep action active so they can retry “YES” if you prefer, or call endAction()
  }
}

function endAction() {
  action = { mode: null, step: 0, payload: {}, prevPlaceholder: "" };
  resetPromptHint();
}

export function setupPrompt() {
  const btnSend = document.getElementById("btnSend");
  const prompt = els.prompt(); // textarea

  // ---- Ember selection ------------------------------------------------------
  function speakEmberIntro(role) {
    let text = "";
    switch (role) {
      case "finance":
        text =
          "Welcome. I’m your financial Ember. We can explore your goals, investments, or strategies together.";
        break;
      case "travel":
        text =
          "Hello Traveller. I’m your journey guide. Tell me where you’d like to go or what dreams you carry.";
        break;
      case "psychologist":
        text =
          "I’m here to listen and reflect. Let’s talk, and we’ll find clarity together.";
        break;
    }
    speakWithEmber(text);
  }

  if (!_burnHooksBound) {
    _burnHooksBound = true;
    // Stop burning when leaving / re-open if you come back and an Ember is active
    window.addEventListener("beforeunload", stopEmberBurnLoop);
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        stopEmberBurnLoop();
      } else if (currentSpeaker !== "polistar") {
        startEmberBurnLoop();
      }
    });
  }
  onEmberSelected((role) => {
    currentSpeaker = role;
    currentEmber = role;
    setActiveEmberUI(role); // ⬅️ swap visuals
    // your existing intro + burn loop
    (function speakEmberIntro() {
      let text = "";
      switch (role) {
        case "finance":
          text =
            "Welcome. I’m your financial Ember. We can explore your goals, investments, or strategies together.";
          break;
        case "travel":
          text =
            "Hello Traveller. I’m your journey guide. Tell me where you’d like to go or what dreams you carry.";
          break;
        case "psychologist":
          text =
            "I’m here to listen and reflect. Let’s talk, and we’ll find clarity together.";
          break;
      }
      speakWithEmber(text);
    })();
    if (!emberBurnInterval) startEmberBurnLoop();
  });

  // ---- Helpers --------------------------------------------------------------

  function showSwapPanel() {
    setSheet(true);
  }

  async function initiateMetaMaskLogin() {
    if (!window.ethereum || !window.ethereum.isMetaMask) {
      alert(
        "MetaMask not detected. Please install it from https://metamask.io."
      );
      return;
    }
    try {
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });
      if (!accounts || accounts.length === 0)
        throw new Error("No MetaMask accounts found.");

      const address = accounts[0];
      const message = `Sign in to Polyworld as ${address}`;
      const signature = await ethereum.request({
        method: "personal_sign",
        params: [message, address],
      });

      await axios.post(ENDPOINTS.authenticateMetamask, {
        address,
        message,
        signature,
      });
      await mergeSessions(window.currentWalletAddress, address);

      if (
        address !== window.currentWalletAddress ||
        window.polyUser?.generated
      ) {
        const user = { address, privateKey: "", generated: false };
        localStorage.setItem("polyUser", JSON.stringify(user));
        window.polyUser = user;
      }

      window.currentWalletAddress = address;
      window.currentTravellerId = address;

      showUserAddress();
      await displayPolistarBalance(true);
      await displayOnchainBalance();
    } catch (err) {
      console.error("❌ MetaMask login failed:", err);
      alert("MetaMask connection failed. Please try again.");
    }
  }

  function startEmberBurnLoop() {
    if (emberBurnInterval) return; // already running
    emberBurnInterval = setInterval(async () => {
      if (currentSpeaker === "polistar") return; // only burn while in Ember
      const userId = window.currentTravellerId || window.currentWalletAddress;
      if (!userId) {
        console.warn("🛑 No Traveller ID. Skipping burn.");
        return;
      }

      try {
        console.log("🔥 Burning 1 POLISTAR for Ember session…");
        await burnPolistarToken(
          userId,
          1,
          `Auto-burn during ${currentSpeaker} session`
        );
        speakWithEmber(
          "1 POLISTAR has been spent to continue our conversation."
        );
        // refresh balances in the UI
        await displayPolistarBalance(false);
        await displayOnchainBalance();
      } catch (err) {
        console.error("❌ Burn error:", err);
        // (optional) surface a soft status message:
        // typeStatusMessage("Couldn’t burn POLISTAR. Check connection and try again.");
      }
    }, 30_000);
  }

  function stopEmberBurnLoop() {
    if (!emberBurnInterval) return;
    clearInterval(emberBurnInterval);
    emberBurnInterval = null;
    console.log("🛑 Ember session ended. Burn loop stopped.");
  }

  function speakWithCurrent(text) {
    if (currentSpeaker === "polistar") speakWithPolistar(text);
    else speakWithEmber(text);
  }

  async function chatHandlerCall(message) {
    const travellerAddress = window.currentWalletAddress;
    const sessionId = travellerAddress || `guest-${crypto.randomUUID()}`;
    const res = await fetch(ENDPOINTS.chatHandler, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message,
        sessionId,
        userAddress: travellerAddress,
        ember: currentEmber,
      }),
    });
    const data = await res.json().catch(() => ({}));
    return (data && data.reply) || "Hmm… I didn’t quite catch that.";
  }

  // Central command handler used by text, tiles, and toolbar tray
  function runLocalCommand(cmd) {
    const chatArea = els.chatArea();
    const box = document.getElementById("cameraBox");
    switch (cmd) {
      case "hidecamera":
        if (box) {
          box.style.visibility = "hidden";
          box.style.opacity = 0;
          speakWithPolistar("Camera is now hidden.");
        }
        return true;

      case "showcamera":
        if (box) {
          box.style.visibility = "visible";
          box.style.opacity = 1;
          speakWithPolistar("Camera is now visible.");
        }
        return true;

      case "clearaddress":
        clearUserAddress();
        displayOnchainBalance();
        displayPolistarBalance();
        return true;

      case "hidechat":
        chatArea.classList.add("invisible");
        return true;
      case "showchat":
        chatArea.classList.remove("invisible");
        return true;
      case "buypoli":
        startBuyPoliFlow();
        return true;
      case "swappolistar":
        startSwapPolistarFlow();
        return true;
      case "transferpolistar":
        startTransferPolistarFlow();
        return true;
      case "showembers":
        showEmberPanel();
        speakWithPolistar("Here are the Embers available to guide you.");
        return true;

      case "connectmetamask":
      case "metamask":
        initiateMetaMaskLogin();
        return true;

      case "polistarback":
      case "stop":
        currentSpeaker = "polistar";
        currentEmber = null;
        stopEmberBurnLoop();
        restorePolistarUI(); // ← removes the mini
        speakWithPolistar("Polistar has returned. I’ll guide you again.");
        return true;
      case "pause":
        stopEmberBurnLoop();
        speakWithEmber("We paused our conversation.");
        return true;

      default:
        return false;
    }
  }

  async function process(text) {
    const t = (text || "").trim();
    if (!t) return;

    // === conversational actions take precedence ===
    if (action.mode) {
      // global cancel
      if (t.toLowerCase() === "cancel") {
        typeStatusMessage("Cancelled.");
        endAction();
        return;
      }

      // handle Buy POLI flow
      if (action.mode === "buypoli") {
        if (action.step === 1) {
          const usdt = parseAmount(t);
          if (!isFinite(usdt) || usdt <= 0) {
            typeStatusMessage(
              "Please enter a valid USDT amount (e.g., 10) or type CANCEL."
            );
            setPromptHint("Enter USDT amount (e.g., 10)");
            return;
          }
          await confirmBuyPoli(usdt);
          return;
        }
        if (action.step === 2) {
          const a = t.toLowerCase();
          if (a === "yes" || a === "y") {
            await executeBuyPoli();
          } else {
            typeStatusMessage("Cancelled.");
            endAction();
          }
          return;
        }
      } else if (action.mode === "swappolistar") {
        if (action.step === 1) {
          const poliAmount = parseAmount(t);
          if (!isFinite(poliAmount) || poliAmount <= 0) {
            typeStatusMessage(
              "Please enter a valid POLI amount (e.g., 10) or type CANCEL."
            );
            setPromptHint("Enter POLI amount (e.g., 10)");
            return;
          }
          await confirmSwapPolistar(poliAmount);
          return;
        }
        if (action.step === 2) {
          const a = t.toLowerCase();
          if (a === "yes" || a === "y") {
            await executeSwapPolistar();
          } else {
            typeStatusMessage("Cancelled.");
            endAction();
          }
          return;
        }
      } else if (action.mode === "transferpolistar") {
        // echo user input
        addMsg("user", t);

        if (t.toLowerCase() === "cancel") {
          typeStatusMessage("Cancelled.");
          endAction();
          return;
        }

        if (action.step === 1) {
          await confirmTransferRecipient(t);
          return;
        }
        if (action.step === 2) {
          await confirmTransferAmount(t);
          return;
        }
        if (action.step === 3) {
          const a = t.toLowerCase();
          if (a === "yes" || a === "y") {
            await executeTransferPolistar();
          } else {
            typeStatusMessage("Cancelled.");
            endAction();
          }
          return;
        }
      }

      // (future actions go here)

      return;
    }

    // Commands typed directly
    if (runLocalCommand(t.toLowerCase())) {
      // prompt is cleared by caller
      return;
    }

    // Traveller message
    addMsg("user", t);

    // Thinking bubble
    const thinking = document.createElement("div");
    thinking.className =
      "self-center italic text-white/70 px-4 py-2 animate-pulse";
    thinking.textContent = currentSpeaker + " is thinking...";
    els.chatArea().appendChild(thinking);
    els.chatArea().scrollTop = els.chatArea().scrollHeight;

    // Simulated delay + backend call
    setTimeout(async () => {
      els.chatArea().removeChild(thinking);
      const reply = await chatHandlerCall(t);
      // Optional: interpret reply as a command
      // if (runLocalCommand(reply.toLowerCase())) return;
      speakWithCurrent(reply);
      addMsg("assistant", reply);
    }, 1500);

    // First-time bootstraps
    if (!firstResponseSent) {
      firstResponseSent = true;
      loadExistingUser();
      flipToBack(true);
      showUserAddress();
      displayPolistarBalance(true);
      displayOnchainBalance();
    }
  }

  function handleSend() {
    process(prompt.value);
    prompt.value = "";

    // shrink textarea back to one line
    if (typeof prompt.__pw_autogrow_reset__ === "function") {
      prompt.__pw_autogrow_reset__();
    } else if (typeof prompt.__pw_autogrow__ === "function") {
      prompt.__pw_autogrow__();
    } else {
      prompt.style.height = "";
    }
  }

  // Send button
  btnSend?.addEventListener("click", handleSend);

  // Enter sends, Shift+Enter = new line
  prompt?.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.keyCode === 13) {
      if (e.shiftKey) return; // allow newline
      e.preventDefault();
      handleSend();
    }
  });

  // ---- Events from other modules -------------------------------------------
  // Toolbar tray dispatches commands here
  window.addEventListener("pw:run-cmd", (e) => {
    const raw = (e.detail?.cmd || "").toLowerCase();
    const cmd = raw === "buypolistar" ? "swappolistar" : raw; // alias
    runLocalCommand(cmd);
  });

  // Toolbar/elsewhere can trigger MetaMask connect
  window.addEventListener("pw:connect-metamask", initiateMetaMaskLogin);
}

// ---- Timed rewards ----------------------------------------------------------
export function startPolistarTimers() {

  // 10s signup gift
  setTimeout(async () => {
    try {
      const travellerId =
        window.currentTravellerId ||
        window.travellerId ||
        window.currentWalletAddress;
      const address = window.currentWalletAddress || null;
      if (!travellerId || !address) {
        console.warn("[rewards] missing ids for 10s gift", {
          travellerId,
          address,
        });
        return;
      }
      const ok = await mintPolistarReward(travellerId, address, 5);
      if (ok) {
        typeStatusMessage("🎁 +5 POLISTAR received!");
        speakWithPolistar("You’ve received 5 polistars for signing in.");
        const hud = document.getElementById("poliAmount");
        if (hud) hud.textContent = 5;
      }
    } catch (e) {
      console.error("[rewards] 10s gift failed:", e);
    }
  }, 10000);

  // 1-minute gift
  setTimeout(async () => {
    try {
      window.milestoneRewarded ||= { "1min": false, "3min": false };
      if (window.milestoneRewarded["1min"]) return;

      const travellerId =
        window.currentTravellerId ||
        window.travellerId ||
        window.currentWalletAddress;
      const address = window.currentWalletAddress || null;
      if (!travellerId || !address) return;

      const ok = await mintPolistarReward(travellerId, address, 10);
      if (ok) {
        typeStatusMessage("⏱️ +10 POLISTAR for your attention");
        speakWithPolistar(
          "You’ve received 10 polistars for spending a moment with me."
        );
        window.milestoneRewarded["1min"] = true;

        const polistar = await getPolistarBalance(address);
        const el = document.getElementById("balPolistar");
        if (el) el.textContent = parseInt(polistar.balance);
        const hud = document.getElementById("poliAmount");
        if (hud) hud.textContent = parseInt(polistar.balance);
      }
    } catch (e) {
      console.error("[rewards] 1min gift failed:", e);
    }
  }, 60000);

  // 3-minute gift
  setTimeout(async () => {
    try {
      if (window.milestoneRewarded?.["3min"]) return;

      const travellerId =
        window.currentTravellerId || window.travellerId || null;
      const address = window.currentWalletAddress || null;
      if (!travellerId || !address) return;

      const ok = await mintPolistarReward(travellerId, address, 10);
      if (ok) {
        typeStatusMessage("⏳ +10 more POLISTAR for your presence");
        speakWithPolistar(
          "Another 10 polistars, gifted for your continued presence."
        );
        window.milestoneRewarded["3min"] = true;

        const polistar = await getPolistarBalance(address);
        const el = document.getElementById("balPolistar");
        if (el) el.textContent = parseInt(polistar.balance);
        const hud = document.getElementById("poliAmount");
        if (hud) hud.textContent = parseInt(polistar.balance);

      }
    } catch (e) {
      console.error("[rewards] 3min gift failed:", e);
    }
  }, 180000);
}

// Expose so balances.js can kick it off on first-time balance==0
window.startPolistarTimers = startPolistarTimers;
