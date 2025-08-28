// functions/device/verifyDeviceLoginToken.js
const functions = require("firebase-functions/v2/https");
const admin = require("firebase-admin");


exports.verifyDeviceLoginToken = functions.onRequest({ cors: true }, async (req, res) => {
  const { t: token } = req.query;
  if (!token) return res.status(400).send("Missing token");

  const doc = await admin.firestore().collection("deviceLoginTokens").doc(token).get();
  if (!doc.exists) return res.status(404).send("Invalid token");

  const { userId, expiresAt } = doc.data();
  if (Date.now() > expiresAt) return res.status(410).send("Token expired");

  await doc.ref.delete();

  res.json({ userId });
});
