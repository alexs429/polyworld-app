const functions = require("firebase-functions");
const { getFirestore } = require("firebase-admin/firestore");
const cors = require("cors")({ origin: true });

exports.getPolistarBalance = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    const { uid } = req.body;

    if (!uid) {
      return res.status(400).json({ error: "Missing uid" });
    }

    try {
      const db = getFirestore();
      const tokenRef = db.collection("users").doc(uid).collection("tokens").doc("POLISTAR");
      const snap = await tokenRef.get();

      if (!snap.exists) {
        return res.status(200).json({
          balance: 0,
          withdrawable: 0,
          symbolic: false,
          swappable: false,
        });
      }

      const data = snap.data();

      res.status(200).json({
        balance: Number(data.balance || 0),
        withdrawable: Number(data.withdrawable || 0),
        symbolic: !!data.symbolic || false,
        swappable: !!data.swappable || false,
        updatedAt: data.updatedAt || null,
      });
    } catch (error) {
      console.error("❌ getPolistarBalance failed:", error);
      res.status(500).json({ error: "Failed to get POLISTAR balance" });
    }
  });
});
