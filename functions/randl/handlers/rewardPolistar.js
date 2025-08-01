const functions = require("firebase-functions");
const { getFirestore } = require("firebase-admin/firestore");
const cors = require("cors")({ origin: true });

exports.rewardPolistar = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    const { uid, address, amount } = req.body;

    console.log("🎯 Received rewardPolistar request:", req.body);

    if (!uid || !address || !amount || isNaN(amount)) {
      return res.status(400).json({ error: "Missing or invalid uid/address/amount" });
    }

    try {
      const db = getFirestore();
      const tokenRef = db.collection("users").doc(uid).collection("tokens").doc("POLISTAR");
      const snap = await tokenRef.get();
      const current = snap.exists ? snap.data().balance || 0 : 0;

      const newBalance = current + Number(amount);

      await tokenRef.set(
        {
          balance: newBalance,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );

      console.log(`✅ Minted ${amount} POLISTAR for ${uid}`);
      res.status(200).json({ balance: newBalance });
    } catch (error) {
      console.error("❌ rewardPolistar failed:", error);
      res.status(500).json({ error: "Server error" });
    }
  });
});
