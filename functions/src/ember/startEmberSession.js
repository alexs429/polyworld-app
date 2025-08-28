// Skeleton with atomic POLISTAR decrement; wire into Dialogflow later
const { onRequest } = require("firebase-functions/v2/https");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const admin = require("firebase-admin");
try { admin.initializeApp(); } catch (_) {}

exports.startEmberSession = onRequest(async (req, res) => {
  const { uid, emberId, cost = 10, sessionSeconds = 30, graceSeconds = 10 } = req.body || {};
  if (!uid || !emberId) return res.status(400).json({ error: "missing_fields" });

  const db = getFirestore();
  const tokRef = db.doc(`users/${uid}/tokens/POLISTAR`);
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
