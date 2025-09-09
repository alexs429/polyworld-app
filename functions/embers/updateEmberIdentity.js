const functions = require("firebase-functions");
const admin = require("firebase-admin");
const cors = require("cors")({ origin: true });

exports.updateEmberIdentity = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    if (req.method !== "POST") return res.status(405).send("Method Not Allowed");

    const { emberId, dob, email, mobile } = req.body;
    if (!emberId) return res.status(400).json({ error: "Missing emberId" });

    try {
      const ref = admin.firestore().doc(`embers/${emberId}`);
      const snap = await ref.get();
      const data = snap.data() || {};
      const currentStep = data.trainingProgress?.step || 0;

      if (currentStep < 4) {
        return res.status(400).json({ error: "Identity step not yet available. Current step: " + currentStep });
      }

      await ref.set({
        identity: { dob, email, mobile, identityComplete: true },
        trainingProgress: { step: 6, complete: false }
      }, { merge: true });

      return res.json({ ok: true, nextStep: 6 });
    } catch (err) {
      console.error("❌ updateEmberIdentity failed:", err);
      return res.status(500).json({ error: err.message });
    }
  });
});
