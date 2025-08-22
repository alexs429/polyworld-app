// --- Global TTS tracking ---
let __emberSpeaking = false;
let __polistarSpeaking = false;

export function stopEmberNow() {
  // Web Speech API can only cancel globally, so we also clean up our state/UI.
  if (!("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  __emberSpeaking = false;
  __polistarSpeaking = false;

  // Let the rest of the app know we stopped (end events usually fire too).
  window.dispatchEvent(
    new CustomEvent("pw:tts-end", {
      detail: { who: "ember", reason: "manual-cancel" },
    })
  );
  window.dispatchEvent(
    new CustomEvent("pw:tts-end", {
      detail: { who: "polistar", reason: "manual-cancel" },
    })
  );

  // Reset button UI
  try {
    updateTtsButtons(false);
  } catch {}
}

/**
 * Optional convenience: call once to stop Ember whenever the user interacts.
 * Tweak the selectors as you like.
 */
export function wireStopOnUserActions() {
  const root = document;
  const stop = (ev) => {
    // ignore clicks on the TTS toggle itself so the user can enable/disable without cancel
    const target = ev.target.closest?.("#btnTTS, #tbTTS, #aiTtsToggle");
    if (!target) stopEmberNow();
  };

  // Common interactive spots
  const selectors = [
    "#btnSend",
    "#btnPlus",
    "#btnMic",
    ".pw-tool", // tool tray buttons
    ".tile", // ember chooser tiles
    "[data-cmd]", // your tool buttons have data-cmd
    "[data-ember]", // ember selector buttons
    ".btn", // generic buttons in composer
  ];

  // Use event delegation to catch new elements too
  root.addEventListener(
    "click",
    (e) => {
      if (selectors.some((sel) => e.target.closest?.(sel))) stop(e);
    },
    true
  );
}

// Persisted “hear Polistar” toggle
let ttsEnabled = JSON.parse(
  localStorage.getItem("polistar_tts_enabled") || "true"
);

function updateTtsButtons(isSpeaking = false) {
  const ids = ["btnTTS", "tbTTS", "aiTtsToggle"]; // bubble, toolbar, optional alias
  ids.forEach((id) => {
    const b = document.getElementById(id);
    if (!b) return;
    b.setAttribute("aria-pressed", String(ttsEnabled));
    b.dataset.on = String(ttsEnabled);
    b.textContent = ttsEnabled ? "🔊" : "🔇";
    b.dataset.label = ttsEnabled ? "ON" : "OFF";   // ← add this
    b.classList.toggle("speaking", !!isSpeaking && ttsEnabled);
  });
}

export function getTTSEnabled() {
  return ttsEnabled;
}
export function setTTSEnabled(v) {
  ttsEnabled = !!v;
  localStorage.setItem("polistar_tts_enabled", JSON.stringify(ttsEnabled));
  updateTtsButtons(false);
}
export function toggleTTSEnabled() {
  setTTSEnabled(!ttsEnabled);
}

// Wires buttons once (bubble + toolbar)
export function initTTSUI() {
  updateTtsButtons(false);
  const handler = () => toggleTTSEnabled();
  document.getElementById("btnTTS")?.addEventListener("click", handler);
  document.getElementById("tbTTS")?.addEventListener("click", handler);
  document.getElementById("aiTtsToggle")?.addEventListener("click", handler);
}

export function speakWithPolistar(text) {
  if (!ttsEnabled || !("speechSynthesis" in window)) return;

  const speak = () => {
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 1.1;
    u.pitch = 1.1;

    const voices = window.speechSynthesis.getVoices();
    const preferred =
      voices.find(
        (v) =>
          v.lang.includes("en-GB") && v.name.toLowerCase().includes("female")
      ) ||
      voices.find((v) => v.lang.includes("en-GB")) ||
      voices.find((v) => v.name.toLowerCase().includes("female")) ||
      voices[0];

    if (preferred) u.voice = preferred;

    u.onstart = () => {
      __polistarSpeaking = true;
      updateTtsButtons(true);
      window.dispatchEvent(
        new CustomEvent("pw:tts-start", { detail: { who: "polistar" } })
      );
    };
    u.onend = () => {
      __polistarSpeaking = false;
      updateTtsButtons(false);
      window.dispatchEvent(
        new CustomEvent("pw:tts-end", { detail: { who: "polistar" } })
      );
    };
    u.onerror = () => {
      __polistarSpeaking = false;
      updateTtsButtons(false);
      window.dispatchEvent(
        new CustomEvent("pw:tts-end", { detail: { who: "polistar" } })
      );
    };

    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  };

  if (window.speechSynthesis.getVoices().length > 0) speak();
  else window.speechSynthesis.onvoiceschanged = () => speak();
}

export function speakWithEmber(text, preferredVoiceName = null) {
  const synth = window.speechSynthesis;
  if (!synth) return;

  const speak = () => {
    // kill anything queued/running so Ember starts fresh
    synth.cancel();

    const u = new SpeechSynthesisUtterance(text);
    const voices = synth.getVoices();

    let v = preferredVoiceName
      ? voices.find((x) => x.name === preferredVoiceName)
      : null;
    if (!v) v = voices[0];
    if (v) u.voice = v;

    u.onstart = () => {
      __emberSpeaking = true;
      window.dispatchEvent(new CustomEvent("pw:tts-start", { detail: { who: "ember" } }));
    };
    u.onend = () => {
      __emberSpeaking = false;
      window.dispatchEvent(new CustomEvent("pw:tts-end", { detail: { who: "ember" } }));
    };
    u.onerror = () => {
      __emberSpeaking = false;
      window.dispatchEvent(new CustomEvent("pw:tts-end", { detail: { who: "ember" } }));
    };

    synth.speak(u);
  };

  if (synth.getVoices().length > 0) speak();
  else synth.onvoiceschanged = () => speak();
}
