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
