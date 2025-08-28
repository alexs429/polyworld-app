// functions/deviceLogin.js
const functions = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const { v4: uuidv4 } = require("uuid");

admin.initializeApp();

exports.createDeviceLoginToken = functions.onRequest({ cors: true }, async (req, res) => {
  const { userId } = req.body || {};
  if (!userId) return res.status(400).send("Missing userId");

  const token = uuidv4(); // or use nanoid
  const expiresAt = Date.now() + 1000 * 60 * 5; // 5 minutes

  await admin.firestore().collection("deviceLoginTokens").doc(token).set({
    userId,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    expiresAt
  });

  const deviceUrl = `https://app.polyworld.life/device-login?t=${token}`;
  res.json({ token, deviceUrl });
});
