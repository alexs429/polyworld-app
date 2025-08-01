const functions = require("firebase-functions");
const admin = require("firebase-admin");
const cors = require("cors")({ origin: true });

if (!admin.apps.length) {
  admin.initializeApp();
}

exports.burnToken = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    try {
      const { userId, tokenId, amount, reason } = req.body;
      const db = admin.firestore();

      if (!userId || !tokenId || !amount || amount <= 0) {
        return res.status(400).send({ error: "Invalid input parameters" });
      }

      const tokenRef = db
        .collection("users")
        .doc(userId.toLowerCase())
        .collection("tokens")
        .doc(tokenId);

      const tokenSnap = await tokenRef.get();

      if (!tokenSnap.exists) {
        return res.status(404).send({ error: "Token balance not found" });
      }

      const tokenData = tokenSnap.data();
      const currentBalance = tokenData.balance || 0;

      if (currentBalance < amount) {
        return res.status(400).send({ error: "Insufficient balance" });
      }

      await tokenRef.update({
        balance: currentBalance - amount,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Optional: log the burn event
      await db.collection("transactions").add({
        userId,
        tokenId,
        amount,
        reason,
        type: "burn",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      res.status(200).json({ status: "success", burned: amount });
    } catch (error) {
      console.error("🔥 BurnToken error:", error);
      res.status(500).json({ error: "Burn failed." });
    }
  });
});
