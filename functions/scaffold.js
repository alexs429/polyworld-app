// functions/scaffold.js
// One-time scaffolder for the new backend layout (safe to re-run)

const fs = require("fs");
const path = require("path");

const ROOT = __dirname;
const SRC = path.join(ROOT, "src");

const files = [
  // Folders
  "src",
  "src/config",
  "src/ledger",
  "src/web3",
  "src/ember",
  "src/admin",

  // Starter files
  ["src/config/constants.js", `
// Centralized collection names and paths
exports.COLLECTIONS = {
  USERS: "users",
  TOKENS: "tokens",
  EMBERS: "embers",
  LEDGER: "ledger/entries",  // top-level collection "ledger/entries"
  RATES: "rates",
  CONFIG: "config"
};
`],

  ["src/ledger/writeEntry.js", `
const { getFirestore, FieldValue } = require("firebase-admin/firestore");

// Minimal ledger writer (extend later with idempotency/dedupe)
exports.writeLedger = async function writeLedger(entry) {
  const db = getFirestore();
  const ref = db.collection("ledger").doc("entries").collection("all").doc();
  await ref.set({ ...entry, ts: FieldValue.serverTimestamp() });
  return ref.id;
};
`],

  ["src/admin/seedBaseConfig.js", `
const { onRequest } = require("firebase-functions/v2/https");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const admin = require("firebase-admin");
try { admin.initializeApp(); } catch (_) {}

exports.seedBaseConfig = onRequest(async (_req, res) => {
  const db = getFirestore();
  const batch = db.batch();

  // /rates/POLI_USDT
  batch.set(db.doc("rates/POLI_USDT"), {
    value: 1.0,
    asOf: FieldValue.serverTimestamp(),
    source: "manual"
  }, { merge: true });

  // /config/tokenMetadata
  batch.set(db.doc("config/tokenMetadata"), {
    POLISTAR: { withdrawable: false, swappable: false, bridge_to: [], symbolic: false },
    POLI:     { withdrawable: true,  swappable: true,  bridge_to: ["POLISTAR"], symbolic: false }
  }, { merge: true });

  await batch.commit();
  res.json({ ok: true });
});
`],

  ["src/admin/seedAllEmbers.js", `
// Stub; we'll fill the payload later before you run it
const { onRequest } = require("firebase-functions/v2/https");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const admin = require("firebase-admin");
try { admin.initializeApp(); } catch (_) {}

const EMBERS = [
  // Add your three embers here before running:
  // { id: "travel", name: "Travel Consultant", status: "active", pricing: { polistarPerSession: 10, sessionSeconds: 30, graceSeconds: 10 }, room: {}, voice: {}, media: {}, dialogflow: {}, nft: {}, gating: {} },
];

exports.seedAllEmbers = onRequest(async (_req, res) => {
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
`],

  ["src/ember/airdropPolistar.js", `
const { onRequest } = require("firebase-functions/v2/https");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const admin = require("firebase-admin");
try { admin.initializeApp(); } catch (_) {}

exports.airdropPolistar = onRequest(async (req, res) => {
  const { uid, amount, reason } = req.body || {};
  if (!uid || !amount) return res.status(400).json({ error: "missing_fields" });

  const db = getFirestore();
  const ref = db.doc(\`users/\${uid}/tokens/POLISTAR\`);
  await ref.set({
    balance: FieldValue.increment(Number(amount)),
    withdrawable: false
  }, { merge: true });

  // (Optional) Write a basic ledger entry later using writeLedger()
  res.json({ ok: true });
});
`],

  ["src/ember/startEmberSession.js", `
// Skeleton with atomic POLISTAR decrement; wire into Dialogflow later
const { onRequest } = require("firebase-functions/v2/https");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const admin = require("firebase-admin");
try { admin.initializeApp(); } catch (_) {}

exports.startEmberSession = onRequest(async (req, res) => {
  const { uid, emberId, cost = 10, sessionSeconds = 30, graceSeconds = 10 } = req.body || {};
  if (!uid || !emberId) return res.status(400).json({ error: "missing_fields" });

  const db = getFirestore();
  const tokRef = db.doc(\`users/\${uid}/tokens/POLISTAR\`);
  const sesRef = db.collection("users").doc(uid).collection("emberSessions").doc();

  try {
    await db.runTransaction(async (tx) => {
      const tSnap = await tx.get(tokRef);
      const bal = Number(tSnap.data()?.balance || 0);
      if (bal < cost) throw new Error("INSUFFICIENT_POLISTAR");

      tx.update(tokRef, { balance: bal - cost });

      const now = new Date();
      const endsAt = new Date(now.getTime() + sessionSeconds * 1000);
      const graceEndsAt = new Date(endsAt.getTime() + graceSeconds * 1000);

      tx.set(sesRef, {
        emberId,
        status: "active",
        accounting: { polistarBurned: cost, startedAt: FieldValue.serverTimestamp(), endsAt, graceEndsAt },
        dialogflow: { sessionId: sesRef.id },
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp()
      });
    });

    res.json({ ok: true, sessionId: sesRef.id });
  } catch (e) {
    if (e.message === "INSUFFICIENT_POLISTAR") return res.status(402).json({ error: e.message });
    console.error(e);
    return res.status(500).json({ error: "internal_error" });
  }
});
`],

  ["src/web3/bridgePoliToPolistar.js", `
// Skeleton only; wire burn tx + ledger later
const { onRequest } = require("firebase-functions/v2/https");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const admin = require("firebase-admin");
try { admin.initializeApp(); } catch (_) {}

exports.bridgePoliToPolistar = onRequest(async (req, res) => {
  const { uid, amount } = req.body || {};
  if (!uid || !amount) return res.status(400).json({ error: "missing_fields" });

  // TODO: perform on-chain burn of POLI here and wait for confirmation
  // const txHash = "0x..."

  const db = getFirestore();
  const ref = db.doc(\`users/\${uid}/tokens/POLISTAR\`);
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const cur = Number(snap.data()?.balance || 0);
    tx.set(ref, { balance: cur + Number(amount), withdrawable: true }, { merge: true });
  });

  res.json({ ok: true /*, txHash*/ });
});
`],

  // Root index.js to export functions (created if missing)
  ["index.js", `
/** Root export file for Firebase Functions */
exports.seedBaseConfig       = require("./src/admin/seedBaseConfig").seedBaseConfig;
exports.seedAllEmbers        = require("./src/admin/seedAllEmbers").seedAllEmbers;

exports.airdropPolistar      = require("./src/ember/airdropPolistar").airdropPolistar;
exports.startEmberSession    = require("./src/ember/startEmberSession").startEmberSession;

exports.bridgePoliToPolistar = require("./src/web3/bridgePoliToPolistar").bridgePoliToPolistar;
`],
];

function ensureDir(p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

function ensureFile(filePath, content) {
  if (fs.existsSync(filePath)) return; // don't overwrite
  fs.writeFileSync(filePath, content.trimStart(), "utf8");
}

(function run() {
  for (const item of files) {
    if (typeof item === "string") {
      ensureDir(path.join(ROOT, item));
    } else {
      const [rel, content] = item;
      const fp = path.join(ROOT, rel);
      ensureDir(path.dirname(fp));
      ensureFile(fp, content);
    }
  }
  console.log("✅ Scaffolding complete.");
})();
