const functions = require("firebase-functions");
const admin = require("firebase-admin");
const cors = require("cors")({ origin: true });

if (admin.apps.length === 0) {
  admin.initializeApp();
}

exports.updateEmberWallet = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    if (req.method !== "POST") return res.status(405).send("Method Not Allowed");

    const { emberId, payoutAddress } = req.body;
    if (!emberId || !payoutAddress) return res.status(400).json({ error: "Missing data" });

    try {
      const ref = admin.firestore().doc(`embers/${emberId}`);
      const snap = await ref.get();
      const data = snap.data() || {};
      const currentStep = data.trainingProgress?.step || 0;

      if (currentStep < 6) {
        return res.status(400).json({ error: "Wallet step not yet available. Current step: " + currentStep });
      }

      await ref.set({
        wallet: {
          chainId: 11155111,
          payoutAddress,
          policy: { payoutMode: "direct", receivePoli: true, receiveUsdt: true },
          verified: true
        },
        trainingProgress: { step: 7, complete: false }
      }, { merge: true });

      return res.json({ ok: true, nextStep: 7 });
    } catch (err) {
      console.error("❌ updateEmberWallet failed:", err);
      return res.status(500).json({ error: err.message });
    }
  });
});
