const { onRequest } = require("firebase-functions/v2/https");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const admin = require("firebase-admin");
try { admin.initializeApp(); } catch (_) {}

exports.airdropPolistar = onRequest(async (req, res) => {
  const { uid, amount, reason } = req.body || {};
  if (!uid || !amount) return res.status(400).json({ error: "missing_fields" });

  const db = getFirestore();
  const ref = db.doc(`users/${uid}/tokens/POLISTAR`);
  await ref.set({
    balance: FieldValue.increment(Number(amount)),
    withdrawable: false
  }, { merge: true });

  // (Optional) Write a basic ledger entry later using writeLedger()
  res.json({ ok: true });
});
