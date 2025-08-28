const functions = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const { v4: uuidv4 } = require("uuid");


/**
 * Cloud Function to create a short-lived token for device login.
 * Stores the token in Firestore with expiry (5 minutes by default).
 * Returns a URL that can be turned into a QR code and scanned on another device.
 *
 * Expected input: { userId: string }
 * Output: { token: string, deviceUrl: string }
 */
exports.createDeviceLoginToken = functions.onRequest({ cors: true }, async (req, res) => {
  try {
    const { userId } = req.body || {};
    if (!userId) return res.status(400).send("Missing userId");

    const token = uuidv4(); // generate unique login token
    const expiresAt = Date.now() + 1000 * 60 * 5; // token valid for 5 minutes

    await admin.firestore().collection("deviceLoginTokens").doc(token).set({
      userId,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      expiresAt
    });

    const deviceUrl = `https://app.polyworld.life/device-login?t=${token}`;
    res.status(200).json({ token, deviceUrl });
  } catch (err) {
    console.error("createDeviceLoginToken error:", err);
    res.status(500).send("Internal server error");
  }
});
