const { getStorage } = require("firebase-admin/storage");
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const cors = require("cors")({ origin: true });

if (admin.apps.length === 0) {
  admin.initializeApp();
}

exports.uploadEmberDescription = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    try {
      // ✅ Expect JSON body
      const { emberId, fileContent } = req.body;
      if (!emberId || !fileContent) {
        return res.status(400).json({ error: "Missing emberId or fileContent" });
      }

      const ref = admin.firestore().doc(`embers/${emberId}`);
      const snap = await ref.get();
      const data = snap.data() || {};
      const currentStep = data.trainingProgress?.step || 0;

      if (currentStep < 8) {
        return res.status(400).json({
          error: "Description upload not yet available. Current step: " + currentStep,
        });
      }

      // Save file to Storage
      const bucket = getStorage().bucket();
      const path = `embers/${emberId}/longDescription.txt`;
      await bucket.file(path).save(Buffer.from(fileContent, "utf8"), {
        contentType: "text/plain",
      });

      // Update Firestore
      await ref.set(
        {
          persona: {
            descriptionFile: `gs://polyworld-2f581.appspot.com/${path}`,
          },
          trainingProgress: { step: 9, complete: false },
        },
        { merge: true }
      );

      return res.json({ ok: true, path, nextStep: 9 });
    } catch (err) {
      console.error("❌ uploadEmberDescription failed:", err);
      return res.status(500).json({ error: err.message });
    }
  });
});
