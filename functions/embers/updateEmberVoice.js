const functions = require("firebase-functions");
const admin = require("firebase-admin");
const cors = require("cors")({ origin: true });

exports.updateEmberVoice = functions.https.onRequest(async (req, res) => {
  cors(req, res, async () => {
    if (req.method !== "POST") {
      return res.status(405).send("Method Not Allowed");
    }

    const { emberId, voice } = req.body;

    if (!emberId || !voice) {
      return res.status(400).json({ error: "Missing emberId or voice" });
    }

    const voiceUpper = String(voice).toUpperCase();
    if (!["MALE", "FEMALE"].includes(voiceUpper)) {
      return res.status(400).json({ error: "Invalid voice. Must be MALE or FEMALE" });
    }

    try {
      const firestore = admin.firestore();

      await firestore.doc(`embers/${emberId}`).set(
        {
          voice: {
            synthesizeSpeechConfig: {
              languageCode: "en-GB",
              pitch: 0,
              speakingRate: 1,
              voice: {
                ssmlGender: voiceUpper,
              },
            },
          },
          trainingProgress: { step: 5, complete: false }, // 🔹 advance to Step 5,
        },
        { merge: true }
      );

      return res.json({ ok: true, emberId, voice: voiceUpper });
    } catch (err) {
      console.error("❌ updateEmberVoice failed:", err);
      return res.status(500).json({ error: err.message });
    }
  });
});
