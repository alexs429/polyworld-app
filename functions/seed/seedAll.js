// Central export for Polyworld Firebase Cloud Functions
const functions = require("firebase-functions");
const { db } = require("../utils/firebase");
// --- add at top of functions/seed/seedAll.js ---
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const admin = require("firebase-admin");
try {
  admin.initializeApp();
} catch (_) {}

const EMBERS = [
  {
    id: "travel",
    name: "Travel Consultant",
    greeting: "Hey! I’m your Travel Ember—want me to sketch a quick itinerary?",
    status: "active",
    persona: {
      tagline: "Itineraries, fares, routing hacks.",
      longBio:
        "Crafts efficient, realistic itineraries with alliance perks and fare rules.",
      tone: "warm, concise, practical",
    },
    identity: {
      firstName: "Samantha",
      lastName: "Smith",
      dob: "1995-10-20",
      email: "sam@gmail.com",
      mobile: "+61 413 335251",
      identityHash: null, // to be computed
      identityComplete: true,
    },
    dialogflow: {
      agentId: "7776b620-5183-440e-8ec7-65912c072979",
      name: null,
      location: "global",
      languageCode: "en",
      dataStoreIds: [],
    },
    pricing: {
      polistarPerSession: 10,
      sessionSeconds: 30,
      graceSeconds: 10,
    },
    gating: {
      minPolistarToUnlock: 10,
      requiresWallet: true,
    },
    media: {
      avatarUrl:
        "gs://polyworld-2f581.firebasestorage.app/embers/travel/avatar.png",
      bannerUrl: null,
    },
    room: {
      backgroundUrl:
        "gs://polyworld-2f581.firebasestorage.app/rooms/travel/bg.png",
      theme: "studio-dark",
      accent: "#25C2A0",
    },
    voice: {
      synthesizeSpeechConfig: {
        languageCode: "en-GB",
        speakingRate: 1.0,
        pitch: 0.0,
        voice: {
          ssmlGender: "FEMALE",
        },
      },
    },
    wallet: {
      chainId: 11155111,
      payoutAddress: "0xc3bB03156795e26eaA9556BE99F4c898f6CD6fb6",
      verified: true,
      policy: {
        receiveUsdt: true,
        receivePoli: true,
        payoutMode: "direct",
      },
    },
    nft: {
      enabled: true,
      standard: "ERC-721",
      collectionAddress: null,
      imageUrl: null,
      metadataTemplateCid: null,
      mintPolicy: "on_publish",
      status: "not_minted",
      tokenId: null,
      tokenUri: null,
      proofUrl: null,
    },
    analytics: {
      totalSessions: 0,
      totalBurnedPolistar: 0,
    },
  },
  {
    id: "finance",
    name: "Financial Consultant",
    greeting:
      "Hi, I’m the Finance Ember. What goal should we prioritize first?",
    status: "active",
    persona: {
      tagline: "Sensible strategy, simple steps.",
      longBio: "Conservative guidance on saving, drawdowns, and risk control.",
      tone: "calm, evidence-based, clear",
    },
    dialogflow: {
      agentId: "8a328678-b767-47ba-962e-583eb0cb61e9",
      name: null,
      location: "global",
      languageCode: "en",
      dataStoreIds: [],
    },
    pricing: { polistarPerSession: 10, sessionSeconds: 30, graceSeconds: 10 },
    gating: { minPolistarToUnlock: 10, requiresWallet: true },
    media: {
      avatarUrl:
        "gs://polyworld-2f581.firebasestorage.app/embers/finance/avatar.png",
      bannerUrl: null,
    },
    room: {
      backgroundUrl:
        "gs://polyworld-2f581.firebasestorage.app/rooms/finance/bg.png",
      theme: "studio-dark",
      accent: "#6C8EF5",
    },
    voice: {
      synthesizeSpeechConfig: {
        languageCode: "en-AU",
        speakingRate: 1.0,
        pitch: 0.0,
        voice: {
          ssmlGender: "MALE",
        },
      },
    },
    wallet: {
      chainId: 11155111,
      payoutAddress: null,
      verified: false,
      policy: {
        receiveUsdt: false,
        receivePoli: false,
        payoutMode: "periodic_treasury",
      },
    },
    nft: {
      enabled: false,
      standard: "ERC-721",
      collectionAddress: null,
      imageUrl: null,
      metadataTemplateCid: null,
      mintPolicy: "manual",
    },
    analytics: { totalSessions: 0, totalBurnedPolistar: 0 },
  },
  {
    id: "psychologist",
    name: "Psychologist",
    greeting: "Hello, I’m here to listen. What’s on your mind today?",
    status: "active",
    persona: {
      tagline: "Reflect, reframe, reset.",
      longBio:
        "Supportive, boundaries-aware reflections and coping strategies.",
      tone: "empathetic, careful, measured",
    },
    dialogflow: {
      agentId: "fd5c4cc7-a36a-4d3c-8837-c70e6e81ccf7",
      name: null,
      location: "global",
      languageCode: "en",
      dataStoreIds: [],
    },
    pricing: { polistarPerSession: 10, sessionSeconds: 30, graceSeconds: 10 },
    gating: { minPolistarToUnlock: 10, requiresWallet: true },
    media: {
      avatarUrl:
        "gs://polyworld-2f581.firebasestorage.app/embers/psychologist/avatar.png",
      bannerUrl: null,
    },
    room: {
      backgroundUrl:
        "gs://polyworld-2f581.firebasestorage.app/rooms/psychologist/bg.png",
      theme: "studio-dark",
      accent: "#F5A86C",
    },
    voice: {
      synthesizeSpeechConfig: {
        languageCode: "en-US",
        speakingRate: 1.0,
        pitch: 0.0,
        voice: {
          ssmlGender: "FEMALE",
        },
      },
    },
    wallet: {
      chainId: 11155111,
      payoutAddress: null,
      verified: false,
      policy: {
        receiveUsdt: false,
        receivePoli: false,
        payoutMode: "periodic_treasury",
      },
    },
    nft: {
      enabled: false,
      standard: "ERC-721",
      collectionAddress: null,
      imageUrl: null,
      metadataTemplateCid: null,
      mintPolicy: "manual",
    },
    analytics: { totalSessions: 0, totalBurnedPolistar: 0 },
  },
];

// idempotent: merges and updates timestamps
async function seedEmbers(db) {
  const batch = db.batch();
  EMBERS.forEach((e) => {
    const ref = db.collection("embers").doc(e.id);
    batch.set(
      ref,
      {
        ...e,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
  });
  await batch.commit();
  return EMBERS.length;
}

// 🧪 Seeder
const handler = functions.https.onRequest(async (_req, res) => {
  // ✅ add this line to include Embers in the same run
  const embersCount = await seedEmbers(db);

  async function seedPolistarToken() {
    const tokenRef = db.collection("tokens").doc("POLISTAR");

    await tokenRef.set({
      name: "Polyworld Internal Token",
      symbol: "POLISTAR",
      totalSupply: 980000000,
      creator: "0xPolyworldTreasury",
      swappable: true,
      withdrawable: true,
      symbolic: false,
      bridge_to: ["POLI", "USDT", "ETH"],
      mintAuthority: ["0xPolyworldTreasury"],
    });

    console.log("✅ POLISTAR token seeded.");
  }

  seedPolistarToken().catch(console.error);

  res.status(200).send("Seed data created");
});

module.exports = {
  seedAll: handler, // 👈 Export it with a clean name
};
