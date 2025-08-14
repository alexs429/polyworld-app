export const els = {
  chatArea: () => document.getElementById("chatArea"),
  prompt: () => document.getElementById("prompt"),
  send: () => document.getElementById("btnSend"),
  funcSheet: () => document.getElementById("funcSheet"),
  composer: () => document.getElementById("composerWrap"),
  dim: () => document.getElementById("dim"),
  flipInner: () => document.getElementById("flipInner"),
};

let __statusTimer = null;

export function typeStatusMessage(text, cb) {
  const chat = els.chatArea();
  if (!chat) return;
  let status = chat.querySelector(".status-line");
  if (!status) {
    status = document.createElement("div");
    status.className = "status-line";
    chat.appendChild(status);
  }
  if (__statusTimer) clearInterval(__statusTimer);
  status.textContent = "";
  let i = 0;
  const speed = 40;
  __statusTimer = setInterval(() => {
    if (i < text.length) {
      status.textContent += text[i++];
      chat.scrollTop = chat.scrollHeight;
    } else {
      clearInterval(__statusTimer);
      __statusTimer = null;
      cb && cb();
    }
  }, speed);
}

export function addMsg(role, text) {
  const row = document.createElement("div");
  row.className = "msg " + role;
  const bubble = document.createElement("div");
  bubble.className = "bubble-txt";
  bubble.textContent = text;
  row.appendChild(bubble);
  if (role === "user") row.style.justifyContent = "flex-end";
  els.chatArea().appendChild(row);
  els.chatArea().scrollTop = els.chatArea().scrollHeight;
}

export function setSheet(open) {
  els.funcSheet().classList.toggle("open", open);
  els.dim().classList.toggle("open", open);
  els.composer().classList.toggle("shift", open);
  els.chatArea().classList.toggle("sheet-open", open);
  document.getElementById("btnPlus")
    ?.setAttribute("aria-expanded", String(open));
}

export function flipToBack(open) {
  els.flipInner()?.classList.toggle("flipped", !!open);
}
