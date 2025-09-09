const functions = require("firebase-functions");
const admin = require("firebase-admin");
const cors = require("cors")({ origin: true });

if (admin.apps.length === 0) {
  admin.initializeApp();
}

exports.updateEmberPersona = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    if (req.method !== "POST") return res.status(405).send("Method Not Allowed");

    const { emberId, tagline, longBio, tone, description } = req.body;
    if (!emberId) return res.status(400).json({ error: "Missing emberId" });

    try {
      const ref = admin.firestore().doc(`embers/${emberId}`);
      const snap = await ref.get();
      const data = snap.data() || {};
      const currentStep = data.trainingProgress?.step || 0;

      if (currentStep < 7) {
        return res.status(400).json({ error: "Persona step not yet available. Current step: " + currentStep });
      }

      await ref.set({
        persona: { tagline, longBio, tone, description },
        trainingProgress: { step: 8, complete: false }
      }, { merge: true });

      return res.json({ ok: true, nextStep: 8 });
    } catch (err) {
      console.error("❌ updateEmberPersona failed:", err);
      return res.status(500).json({ error: err.message });
    }
  });
});
