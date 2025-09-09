// functions/embers/uploadAvatar.js
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const cors = require("cors")({ origin: true });

exports.uploadAvatar = functions.https.onRequest(async (req, res) => {
  cors(req, res, async () => {
    if (req.method !== "POST") {
      return res.status(405).send("Method Not Allowed");
    }

    const { emberId, image } = req.body;

    if (!emberId || !image) {
      return res.status(400).json({ error: "Missing emberId or image" });
    }

    try {
      const bucket = admin.storage().bucket();

      console.log("📤 Uploading avatar to:", `embers/${emberId}/avatar.png`);

      // Save avatar image
      const base64Data = image.replace(/^data:image\/png;base64,/, "");
      const avatarPath = `embers/${emberId}/avatar.png`;
      await bucket.file(avatarPath).save(Buffer.from(base64Data, "base64"), {
        contentType: "image/png",
        public: false,
      });
      console.log("✅ Avatar uploaded.");

      const source = `rooms/default/bg.png`;
      const target = `rooms/${emberId}/bg.png`;
      //console.log("📋 Copying default background:", source, "→", target);
      await bucket.file(source).copy(bucket.file(target));

      //console.log("✅ Background copied.");
      const firestore = admin.firestore();
      await firestore.doc(`embers/${emberId}`).update({
        "media.avatarUrl": `gs://polyworld-2f581.appspot.com/embers/${emberId}/avatar.png`,
        "room.backgroundUrl": `gs://polyworld-2f581.appspot.com/rooms/${emberId}/bg.png`,
        "trainingProgress.step": 4, // optional: bump step when avatar is saved
        "trainingProgress.updatedAt":
          admin.firestore.FieldValue.serverTimestamp(),
      });

      return res.json({
        ok: true,
        avatarPath: `embers/${emberId}/avatar.png`,
        backgroundPath: target,
      });
    } catch (err) {
      console.error("Upload error:", err);
      return res
        .status(500)
        .json({ error: "Upload failed", details: err.message });
    }
  });
});
