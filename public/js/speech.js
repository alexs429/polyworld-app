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
      updateTtsButtons(true);
      window.dispatchEvent(
        new CustomEvent("pw:tts-start", { detail: { who: "polistar" } })
      );
    };
    u.onend = () => {
      updateTtsButtons(false);
      window.dispatchEvent(
        new CustomEvent("pw:tts-end", { detail: { who: "polistar" } })
      );
    };
    u.onerror = () => {
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
  const speak = () => {
    const u = new SpeechSynthesisUtterance(text);
    const voices = synth.getVoices();
    let v = preferredVoiceName
      ? voices.find((x) => x.name === preferredVoiceName)
      : null;
    if (!v) v = voices[0];
    u.voice = v;
    // NEW: also announce ember TTS to pause STT
    u.onstart = () =>
      window.dispatchEvent(
        new CustomEvent("pw:tts-start", { detail: { who: "ember" } })
      );
    u.onend = () =>
      window.dispatchEvent(
        new CustomEvent("pw:tts-end", { detail: { who: "ember" } })
      );
    u.onerror = () =>
      window.dispatchEvent(
        new CustomEvent("pw:tts-end", { detail: { who: "ember" } })
      );

    synth.speak(u);
  };
  if (synth.getVoices().length > 0) speak();
  else synth.onvoiceschanged = () => speak();
}
