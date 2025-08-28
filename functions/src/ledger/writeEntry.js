const { getFirestore, FieldValue } = require("firebase-admin/firestore");

exports.writeLedger = async function writeLedger(entry) {
  const db = getFirestore();
  const ref = db.collection("ledgerEntries").doc();   // 🔒 single top-level collection
  await ref.set({ ...entry, ts: FieldValue.serverTimestamp() });
  return ref.id;
};