// embers.js (dynamic)
// Requires you to load firebase-init.js BEFORE this file:
// <script type="module" src="/js/firebase-init.js"></script>
// <script type="module" src="/js/embers.js"></script>

import { els } from "./ui.js";
import { db, gsToHttp } from "./firebase-init.js";
import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
} from "https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js";

// ---- Defaults (your existing assets) ----
const DEFAULT_HOST_IMG = "/images/bots/poly.png";
const DEFAULT_ROOM = "/images/rooms/Main Entry.png";

// Internal cache of live embers (keeps your old shape: id, name, desc, img, room)
let EMBERS = [];
let _loaded = false;
let _onSelect = null;
let _activeRaw = null;
export function getActiveEmber() {
  return _activeRaw;
}

// Public: allow other modules to listen for selection
export function onEmberSelected(fn) {
  _onSelect = fn;
}

// Public (optional): expose the current list
export function getEmbers() {
  return [...EMBERS];
}

// ---- Helpers ----
function setRoomBackground(url) {
  document.documentElement.style.setProperty("--bg-img", `url("${url}")`);
}

async function fetchLiveEmbers() {
  const snap = await getDocs(
    query(collection(db, "embers"), where("status", "==", "active"))
  );
  const rows = snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (a.name || "").localeCompare(b.name || ""));

  // Map Firestore docs → UI-friendly objects (keep your old keys)
  const mapped = await Promise.all(
    rows.map(async (e) => {
      let imgHttp = null,
        roomHttp = null;

      if (e?.media?.avatarUrl?.startsWith("gs://")) {
        try {
          imgHttp = await gsToHttp(e.media.avatarUrl);
        } catch {}
      }
      if (e?.room?.backgroundUrl?.startsWith("gs://")) {
        try {
          roomHttp = await gsToHttp(e.room.backgroundUrl);
        } catch {}
      }
      console.log("🔥 RAW EMBER", e.id, e);
      return {
        id: e.id,
        name: e.name || e.id,
        desc: e?.persona?.tagline || e?.persona?.longBio || "",
        img: imgHttp || "/images/bots/ember-generic.png", // fallback if storage URL missing
        room: roomHttp || DEFAULT_ROOM,
        // keep the raw doc in case other modules need details (voice, agentId, etc.)
        _raw: e,
      };
    })
  );

  return mapped;
}

async function ensureLoaded() {
  if (_loaded && EMBERS.length) return;
  EMBERS = await fetchLiveEmbers();
  _loaded = true;
}

/** Show the ember picker as a compact card inside the chat area */
export async function showEmberPanel() {
  await ensureLoaded();

  const area = els.chatArea?.() || document.getElementById("chatArea");
  if (!area) return;

  const old = document.getElementById("emberListCard");
  if (old) old.remove();

  const card = document.createElement("div");
  card.id = "emberListCard";
  card.className = "ember-card";

  card.innerHTML = `
      <div class="ember-card-head">Choose an Ember</div>
      <div class="ember-list">
        ${EMBERS.map(
          (e) => `
          <div class="ember-flip-card">
            <div class="ember-flip-inner" data-id="${e.id}">
              <div class="ember-face ember-front">
                <img class="ember-avatar ember-avatar-clickable" src="${
                  e.img
                }" alt="${e.name}">
                <div class="ember-name">${e.name}</div>
                <div class="ember-desc">${e.desc}</div>
              </div>
              <div class="ember-face ember-back">
                ${
                  e._raw?.nft?.hasOwnProperty("tokenId") &&
                  !!e._raw?.nft?.contract
                    ? `
                    <div class="title">✅ True Ember</div>
                    <div class="field" nowrap>Focus: ${e.name}</div>
                    <div class="field">DOB: 20 Oct 1995</div>
                    <div class="field">Trained by: You</div>
                    <div class="field">ID Hash: ${
                      e._raw?.identity?.identityHash || "—"
                    }</div>
                    <div class="qr"><canvas class="qrCanvas" data-url="https://sepolia.etherscan.io/token/${
                      e._raw.nft.contract
                    }?a=${e._raw.nft.tokenId}"></canvas></div>
                    <div class="proof-link"><a href="https://sepolia.etherscan.io/token/${
                      e._raw.nft.contract
                    }?a=${
                        e._raw.nft.tokenId
                      }" target="_blank">🔍 View on chain</a></div>
                    `
                    : `
                    <div class="title">🕯️ Unminted Ember</div>
                    <div class="field">This Ember has not yet been minted as an identity token.</div>
                    <div class="field">You can still interact with them, but chain reference is not available.</div>
                    `
                }
              </div>
            </div>
          </div>
        `
        ).join("")}
      </div>
  `;

  area.appendChild(card);
  area.scrollTop = area.scrollHeight;

  card.addEventListener("click", (ev) => {
    const avatar = ev.target.closest(".ember-avatar-clickable");
    const flipCard = ev.target.closest(".ember-flip-inner");

    // If user clicked the avatar — select the Ember
    if (avatar && flipCard) {
      const id = flipCard.dataset.id;
      setActiveEmberUI(id);
      card.remove();
      if (typeof _onSelect === "function") {
        const ember = EMBERS.find((x) => x.id === id) || null;
        _activeRaw = ember?._raw || null;
        _onSelect(id, _activeRaw);
      }
      return;
    }

    // If user clicked the card but not the avatar — just flip it
    if (flipCard) {
      flipCard.classList.toggle("flipped");
    }
  });

  // Draw QR codes
  card.querySelectorAll(".qrCanvas").forEach((canvas) => {
    const url = canvas.dataset.url;
    const qr = qrcode(0, "L");
    qr.addData(url);
    qr.make();

    const ctx = canvas.getContext("2d");
    const size = 64;
    canvas.width = size;
    canvas.height = size;
    const tileW = size / qr.getModuleCount();
    const tileH = size / qr.getModuleCount();
    for (let r = 0; r < qr.getModuleCount(); r++) {
      for (let c = 0; c < qr.getModuleCount(); c++) {
        ctx.fillStyle = qr.isDark(r, c) ? "#000" : "#fff";
        const w = Math.ceil((c + 1) * tileW) - Math.floor(c * tileW);
        const h = Math.ceil((r + 1) * tileH) - Math.floor(r * tileH);
        ctx.fillRect(Math.round(c * tileW), Math.round(r * tileH), w, h);
      }
    }
  });
}

export function setActiveEmberUI(emberId) {
  const ember = EMBERS.find((e) => e.id === emberId);
  if (!ember) return;

  const hasNFT =
    ember?._raw?.nft?.hasOwnProperty("tokenId") && !!ember?._raw?.nft?.contract;

  const tokenUrl = hasNFT
    ? `https://sepolia.etherscan.io/token/${ember._raw.nft.contract}?a=${ember._raw.nft.tokenId}`
    : null;

  const avatar = document.getElementById("activeAvatarImg");
  if (!avatar) return;

  // Remove previous flip wrapper if it exists
  const existing = document.getElementById("emberAvatarFlipWrapper");
  if (existing) existing.remove();

  // --- Create flip wrapper ---
  const wrapper = document.createElement("div");
  wrapper.id = "emberAvatarFlipWrapper";
  wrapper.className = "ember-avatar-flip-wrapper";

  const flip = document.createElement("div");
  flip.className = "ember-avatar-inner";

  // --- FRONT face (avatar image) ---
  const front = document.createElement("div");
  front.className = "ember-flip-face ember-flip-front";

  const avatarClone = avatar.cloneNode(true);
  avatarClone.id = "activeAvatarImg";
  avatarClone.src = ember.img;
  avatarClone.className = "ember-avatar-full";

  front.appendChild(avatarClone);
  flip.appendChild(front);

  // --- BACK face (NFT info or Unminted) ---
  const back = document.createElement("div");
  back.className = "ember-flip-face ember-flip-back";

  if (hasNFT) {
    const title = document.createElement("div");
    title.className = "title-row";
    title.innerHTML = `<span class="tick-icon">✅</span><span class="label-text">True Ember</span>`;
    back.appendChild(title);

    const canvas = document.createElement("canvas");
    canvas.className = "nft-qr";
    canvas.width = 80;
    canvas.height = 80;
    back.appendChild(canvas);

    const link = document.createElement("a");
    link.href = tokenUrl;
    link.target = "_blank";
    link.className = "nft-link";
    link.textContent = "🔗 View on chain";
    back.appendChild(link);

    // Draw QR
    const qr = qrcode(0, "L");
    qr.addData(tokenUrl);
    qr.make();
    const ctx = canvas.getContext("2d");
    const size = 80;
    const tileW = size / qr.getModuleCount();
    const tileH = size / qr.getModuleCount();
    for (let r = 0; r < qr.getModuleCount(); r++) {
      for (let c = 0; c < qr.getModuleCount(); c++) {
        ctx.fillStyle = qr.isDark(r, c) ? "#000" : "#fff";
        const w = Math.ceil((c + 1) * tileW) - Math.floor(c * tileW);
        const h = Math.ceil((r + 1) * tileH) - Math.floor(r * tileH);
        ctx.fillRect(Math.round(c * tileW), Math.round(r * tileH), w, h);
      }
    }
  } else {
    const titleRow = document.createElement("div");
    titleRow.className = "title-row";
    titleRow.innerHTML = `<span class="tick-icon">🕯️</span><span class="label-text">Unminted Ember</span>`;
    back.appendChild(titleRow);

    const msg = document.createElement("div");
    msg.className = "field";
    msg.textContent = "This identity has not been minted yet.";
    back.appendChild(msg);
  }

  flip.appendChild(back);
  wrapper.appendChild(flip);
  avatar.parentNode.replaceChild(wrapper, avatar);

  // --- Flip toggle on click ---
  flip.addEventListener("click", () => {
    flip.classList.toggle("flipped");
    const speaker = document.getElementById("voiceToggle");
    if (speaker) {
      speaker.style.display = flip.classList.contains("flipped") ? "none" : "";
    }
  });

  // --- Room background swap ---
  setRoomBackground(ember?.room || DEFAULT_ROOM);

  // --- Mini Polistar button ---
  let mini = document.getElementById("hostMini");
  if (!mini) {
    mini = document.createElement("button");
    mini.id = "hostMini";
    mini.className = "mini-host";
    mini.setAttribute("aria-label", "Return to Polistar");
    mini.innerHTML = `<img src="${DEFAULT_HOST_IMG}" alt="Polistar">`;
    document.body.appendChild(mini);
    mini.addEventListener("click", () => {
      window.dispatchEvent(
        new CustomEvent("pw:run-cmd", { detail: { cmd: "polistarback" } })
      );
    });
  } else {
    const img = mini.querySelector("img");
    if (img) img.src = DEFAULT_HOST_IMG;
  }
}

export function restorePolistarUI() {
  const flipWrapper = document.getElementById("emberAvatarFlipWrapper");
  const parent = flipWrapper?.parentNode;

  if (flipWrapper && parent) {
    // Replace the wrapper with a clean avatar image
    const img = document.createElement("img");
    img.id = "activeAvatarImg";
    img.src = DEFAULT_HOST_IMG;
    img.alt = "Polistar";
    img.className = "ember-avatar-full";
    img.style.transform = "none";
    img.style.filter = "none";
    img.style.opacity = "1";

    parent.replaceChild(img, flipWrapper);
  } else {
    // fallback in case wrapper not found
    const hostImg = document.getElementById("activeAvatarImg");
    if (hostImg) hostImg.src = DEFAULT_HOST_IMG;
  }

  setRoomBackground(DEFAULT_ROOM);

  const mini = document.getElementById("hostMini");
  if (mini) mini.remove();

  // Show speaker toggle again
  const speaker = document.getElementById("voiceToggle");
  if (speaker) speaker.style.display = "";
}
