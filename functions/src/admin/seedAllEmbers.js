// Stub; we'll fill the payload later before you run it
const { onRequest } = require("firebase-functions/https");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const admin = require("firebase-admin");
try { admin.initializeApp(); } catch (_) {}

const EMBERS = [
  {
    id: "travel",
    name: "Travel Consultant",
    status: "active",
    persona: {
      tagline: "Itineraries, fares, routing hacks.",
      longBio: "Crafts efficient, realistic itineraries with alliance perks and fare rules.",
      tone: "warm, concise, practical"
    },
    dialogflow: {
      agentId: "DFCX_TRAVEL_AGENT_ID",   // fill later; ok to leave as placeholder
      name: null,
      location: "global",
      languageCode: "en",
      dataStoreIds: []
    },
    pricing: { polistarPerSession: 10, sessionSeconds: 30, graceSeconds: 10 },
    gating:  { minPolistarToUnlock: 10, requiresWallet: true },
    media: {
      avatarUrl: "gs://poliworld-f165b.appspot.com/embers/travel/avatar.png",
      bannerUrl: null
    },
    room:  { backgroundUrl: "gs://poliworld-f165b.appspot.com/rooms/travel/bg.jpg", theme: "studio-dark", accent: "#25C2A0" },
    voice: { ttsEngine: "dialogflow", audioEncoding: "MP3", sampleRateHertz: 24000,
             synthesizeSpeechConfig: { voice: { name: "en-AU-Neural2-B", ssmlGender: "MALE" }, speakingRate: 1.05, pitch: -1.0 } },
    wallet: { chainId: 11155111, payoutAddress: null, verified: false,
              policy: { receiveUsdt:false, receivePoli:false, payoutMode:"periodic_treasury" } },
    nft: { enabled: true, standard: "ERC-721", collectionAddress: null, imageUrl: null, metadataTemplateCid: null, mintPolicy: "on_publish" },
    analytics: { totalSessions: 0, totalBurnedPolistar: 0 }
  },
  {
    id: "finance",
    name: "Financial Consultant",
    status: "active",
    persona: {
      tagline: "Sensible strategy, simple steps.",
      longBio: "Conservative guidance on saving, drawdowns, and risk control.",
      tone: "calm, evidence-based, clear"
    },
    dialogflow: { agentId: "DFCX_FINANCE_AGENT_ID", name: null, location: "global", languageCode: "en", dataStoreIds: [] },
    pricing: { polistarPerSession: 10, sessionSeconds: 30, graceSeconds: 10 },
    gating:  { minPolistarToUnlock: 10, requiresWallet: true },
    media: { avatarUrl: "gs://poliworld-f165b.appspot.com/embers/finance/avatar.png", bannerUrl: null },
    room:  { backgroundUrl: "gs://poliworld-f165b.appspot.com/rooms/finance/bg.jpg", theme: "studio-dark", accent: "#6C8EF5" },
    voice: { ttsEngine: "dialogflow", audioEncoding: "MP3", sampleRateHertz: 24000,
             synthesizeSpeechConfig: { voice: { name: "en-AU-Neural2-C", ssmlGender: "FEMALE" }, speakingRate: 1.0, pitch: 0 } },
    wallet: { chainId: 11155111, payoutAddress: null, verified: false,
              policy: { receiveUsdt:false, receivePoli:false, payoutMode:"periodic_treasury" } },
    nft: { enabled: false, standard: "ERC-721", collectionAddress: null, imageUrl: null, metadataTemplateCid: null, mintPolicy: "manual" },
    analytics: { totalSessions: 0, totalBurnedPolistar: 0 }
  },
  {
    id: "psychologist",
    name: "Psychologist",
    status: "active",
    persona: {
      tagline: "Reflect, reframe, reset.",
      longBio: "Supportive, boundaries-aware reflections and coping strategies.",
      tone: "empathetic, careful, measured"
    },
    dialogflow: { agentId: "DFCX_PSYCH_AGENT_ID", name: null, location: "global", languageCode: "en", dataStoreIds: [] },
    pricing: { polistarPerSession: 10, sessionSeconds: 30, graceSeconds: 10 },
    gating:  { minPolistarToUnlock: 10, requiresWallet: true },
    media: { avatarUrl: "gs://poliworld-f165b.appspot.com/embers/psychologist/avatar.png", bannerUrl: null },
    room:  { backgroundUrl: "gs://poliworld-f165b.appspot.com/rooms/psych/bg.jpg", theme: "studio-dark", accent: "#F5A86C" },
    voice: { ttsEngine: "dialogflow", audioEncoding: "MP3", sampleRateHertz: 24000,
             synthesizeSpeechConfig: { voice: { name: "en-AU-Neural2-D", ssmlGender: "FEMALE" }, speakingRate: 0.98, pitch: 0.5 } },
    wallet: { chainId: 11155111, payoutAddress: null, verified: false,
              policy: { receiveUsdt:false, receivePoli:false, payoutMode:"periodic_treasury" } },
    nft: { enabled: false, standard: "ERC-721", collectionAddress: null, imageUrl: null, metadataTemplateCid: null, mintPolicy: "manual" },
    analytics: { totalSessions: 0, totalBurnedPolistar: 0 }
  }
];


exports.seedAllEmbers = onRequest(async (_req, res) => {
  const secret = functions.config().admin?.seed_secret;
  if (!secret || req.get("x-admin-secret") !== secret) {
    return res.status(403).json({ error: "forbidden" });
  }
  
  const db = getFirestore();
  const batch = db.batch();


  EMBERS.forEach(e => {
    const ref = db.collection("embers").doc(e.id);
    batch.set(ref, {
      ...e,
      analytics: { totalSessions: 0, totalBurnedPolistar: 0 },
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    }, { merge: true });
  });
  await batch.commit();
  res.json({ ok: true, count: EMBERS.length });
});
