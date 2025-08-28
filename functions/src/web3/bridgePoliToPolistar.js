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
  const ref = db.doc(`users/${uid}/tokens/POLISTAR`);
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const cur = Number(snap.data()?.balance || 0);
    tx.set(ref, { balance: cur + Number(amount), withdrawable: true }, { merge: true });
  });

  res.json({ ok: true /*, txHash*/ });
});
