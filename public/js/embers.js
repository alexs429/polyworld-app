// embers.js
import { els } from "./ui.js";

// 🔗 Use your actual image files
export const EMBERS = [
  {
    id: "finance",
    name: "Finance Ember",
    desc: "Wealth & strategy",
    img: "/images/bots/ember-financial.png",
    room: "/images/rooms/room-financial.png",
  },
  {
    id: "travel",
    name: "Travel Ember",
    desc: "Trips & experiences",
    img: "/images/bots/ember-travel.png",
    room: "/images/rooms/room-travel.png",
  },
  {
    id: "psychologist",
    name: "Psychologist Ember",
    desc: "Listen & reflect",
    img: "/images/bots/ember-psychologist.png", // (note your filename)
    room: "/images/rooms/room-psychologist.png",
  },
];

const DEFAULT_HOST_IMG = "/images/bots/poly.png";
const DEFAULT_ROOM = "/images/rooms/Main Entry.png";

let _onSelect = null;
export function onEmberSelected(fn) {
  _onSelect = fn;
}

/* Utility: update the blurred backdrop by swapping the CSS var */
function setRoomBackground(url) {
  const root = document.documentElement;
  // ensure url("...") format so spaces in filenames are safe
  root.style.setProperty("--bg-img", `url("${url}")`);
}

/** Show the ember picker as a compact card inside the chat area */
export function showEmberPanel() {
  const area = els.chatArea();
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
        <button class="ember-btn" data-id="${e.id}">
          <img class="ember-avatar" src="${e.img}" alt="${e.name}">
          <div>
            <div class="ember-name">${e.name}</div>
            <div class="ember-desc">${e.desc}</div>
          </div>
        </button>
      `
      ).join("")}
    </div>
  `;
  area.appendChild(card);
  area.scrollTop = area.scrollHeight;

  card.addEventListener("click", (ev) => {
    const btn = ev.target.closest(".ember-btn");
    if (!btn) return;
    const id = btn.dataset.id;
    setActiveEmberUI(id); // swap visuals + room
    card.remove();
    if (typeof _onSelect === "function") _onSelect(id);
  });
}

/** Swap the large left avatar to the selected Ember, set room, and show mini Polistar */
export function setActiveEmberUI(emberId) {
  const ember = EMBERS.find((e) => e.id === emberId);

  // swap main avatar
  const hostImg = document.getElementById("activeAvatarImg");
  if (hostImg && ember?.img) hostImg.src = ember.img;

  // swap room background
  if (ember?.room) {
    document.documentElement.style.setProperty(
      "--bg-img",
      `url("${ember.room}")`
    );
  }

  // create mini Polistar if needed
  let mini = document.getElementById("hostMini");
  if (!mini) {
    mini = document.createElement("button");
    mini.id = "hostMini";
    mini.className = "mini-host";
    mini.setAttribute("aria-label", "Return to Polistar");
    mini.innerHTML = `<img src="${DEFAULT_HOST_IMG}" alt="Polistar">`;
    document.body.appendChild(mini);

    mini.addEventListener("click", () => {
      // delegate to your existing command handler
      window.dispatchEvent(
        new CustomEvent("pw:run-cmd", { detail: { cmd: "polistarback" } })
      );
    });
  } else {
    // ensure the image looks good if it already existed
    const img = mini.querySelector("img");
    if (img) img.src = DEFAULT_HOST_IMG;
  }
}

export function restorePolistarUI() {
  // restore main avatar + room
  const hostImg = document.getElementById("activeAvatarImg");
  if (hostImg) hostImg.src = DEFAULT_HOST_IMG;
  document.documentElement.style.setProperty(
    "--bg-img",
    `url("${DEFAULT_ROOM}")`
  );

  // completely remove the mini bubble
  const mini = document.getElementById("hostMini");
  if (mini) mini.remove();
}
