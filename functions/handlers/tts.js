// functions/handlers/tts.js
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const crypto = require("crypto");
const TextToSpeech = require("@google-cloud/text-to-speech").TextToSpeechClient;

try { admin.initializeApp(); } catch {}
const db = admin.firestore();
const TTS = new TextToSpeech();

const BUCKET_NAME =
  admin.app().options.storageBucket ||
  "polyworld-2f581.appspot.com"; // adjust if needed
const bucket = admin.storage().bucket(BUCKET_NAME);

function setCORS(res) {
  res.set({
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, x-admin-secret",
    "Access-Control-Max-Age": "3600",
  });
}
const sha1 = (s) => crypto.createHash("sha1").update(s).digest("hex");

function normalizeConfig(voice) {
  const cfg = voice?.synthesizeSpeechConfig || {};
  const languageCode = cfg.languageCode || "en-US";
  const v = cfg.voice || {};
  const name = v.name || null;
  const ssmlGender = (v.ssmlGender || "NEUTRAL").toUpperCase();
  return {
    languageCode,
    name,
    ssmlGender,
    speakingRate: typeof cfg.speakingRate === "number" ? cfg.speakingRate : 1.0,
    pitch:       typeof cfg.pitch        === "number" ? cfg.pitch        : 0.0,
    sampleRateHertz: Number(voice?.sampleRateHertz) || 24000,
    audioEncoding: (voice?.audioEncoding || "MP3").toUpperCase()
  };
}

async function loadVoiceForEmber(emberId) {
  const snap = await db.collection("embers").doc(emberId).get();
  if (!snap.exists) throw new Error("EMBER_NOT_FOUND");
  const d = snap.data() || {};
  if (!d.voice) throw new Error("VOICE_CONFIG_MISSING");
  return normalizeConfig(d.voice);
}

exports.ttsEmber = functions.https.onRequest(async (req, res) => {
  setCORS(res);

  // Handle preflight
  if (req.method === "OPTIONS") {
    return res.status(204).send("");
  }
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Use POST" });
  }

  try {
    const { text, emberId, voice } = req.body || {};
    const plain = (text || "").toString().trim();
    if (!plain) return res.status(400).json({ error: "Missing text" });

    const maxChars = 1200;
    const toSpeak = plain.length > maxChars ? plain.slice(0, maxChars) : plain;
    const cfg = voice ? normalizeConfig(voice) : await loadVoiceForEmber(emberId || "polistar");

    const key = sha1(JSON.stringify({ toSpeak, cfg }));
    const ext = cfg.audioEncoding === "OGG_OPUS" ? "ogg" : "mp3";
    const objectPath = `tts-cache/${emberId || "unknown"}/${key}.${ext}`;
    const file = bucket.file(objectPath);

    // cache hit?
    const [exists] = await file.exists();
    if (exists) {
      const [url] = await file.getSignedUrl({ action: "read", expires: Date.now() + 6 * 60 * 60 * 1000 });
      return res.json({ url, cached: true });
    }

    const request = {
      input: { text: toSpeak },
      voice: {
        languageCode: cfg.languageCode,
        name: cfg.name || undefined,
        ssmlGender: cfg.name ? undefined : cfg.ssmlGender,
      },
      audioConfig: {
        audioEncoding: cfg.audioEncoding,
        speakingRate: cfg.speakingRate,
        pitch: cfg.pitch,
        sampleRateHertz: cfg.sampleRateHertz,
      },
    };
    const [resp] = await TTS.synthesizeSpeech(request);
    if (!resp.audioContent) throw new Error("EMPTY_AUDIO");

    await file.save(Buffer.from(resp.audioContent, "base64"), {
      contentType: cfg.audioEncoding === "OGG_OPUS" ? "audio/ogg" : "audio/mpeg",
      metadata: { cacheControl: "public, max-age=31536000, immutable" },
      resumable: false,
    });

    const [url] = await file.getSignedUrl({ action: "read", expires: Date.now() + 6 * 60 * 60 * 1000 });
    return res.json({ url, cached: false });
  } catch (err) {
    console.error("ttsEmber error:", err);
    // Make sure errors also include CORS headers
    setCORS(res);
    return res.status(500).json({ error: String(err.message || err) });
  }
});
