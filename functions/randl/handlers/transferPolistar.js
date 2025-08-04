const functions = require("firebase-functions");
const admin = require("firebase-admin");
const cors = require("cors")({ origin: true });
const db = admin.firestore();

exports.transferPolistar = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    try {
      const { fromUserId, toUserId, amount } = req.body;

      // Validate input
      if (!fromUserId || !toUserId || !amount || isNaN(amount) || Number(amount) <= 0) {
        return res.status(400).json({ error: "Invalid parameters" });
      }

      const amt = Number(amount);

      const fromRef = db.collection("users").doc(fromUserId).collection("tokens").doc("POLISTAR");
      const toRef = db.collection("users").doc(toUserId).collection("tokens").doc("POLISTAR");

      const [fromSnap, toSnap] = await Promise.all([fromRef.get(), toRef.get()]);

      const fromBal = fromSnap.exists ? fromSnap.data().balance || 0 : 0;
      const toBal = toSnap.exists ? toSnap.data().balance || 0 : 0;

      if (fromBal < amt) {
        return res.status(400).json({ error: "Insufficient balance" });
      }

      // Transfer balances
      await Promise.all([
        fromRef.update({ balance: fromBal - amt }),
        toRef.set({ balance: toBal + amt }, { merge: true }),
      ]);

      // Log history
      const now = admin.firestore.FieldValue.serverTimestamp();
      const tx = {
        from: fromUserId,
        to: toUserId,
        amount: amt,
        timestamp: now,
      };

      await Promise.all([
        db.collection("users").doc(fromUserId).collection("transfers").add({ ...tx, type: "sent" }),
        db.collection("users").doc(toUserId).collection("transfers").add({ ...tx, type: "received" }),
      ]);

      res.status(200).json({ success: true, message: `Transferred ${amt} POLISTAR` });
    } catch (err) {
      console.error("Transfer error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });
});
