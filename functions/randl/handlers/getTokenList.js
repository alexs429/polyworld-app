const functions = require("firebase-functions");
const { getFirestore } = require("firebase-admin/firestore");

exports.getTokenList = functions.https.onCall(async (_data, context) => {
  try {
    const db = getFirestore();
    const snap = await db.collection("token-metadata").get();

    const tokens = {};
    snap.forEach(doc => {
      tokens[doc.id] = doc.data();
    });

    return { tokens };
  } catch (error) {
    console.error("❌ Error fetching token list:", error);
    throw new functions.https.HttpsError("internal", "Failed to get token list", error.message);
  }
});
