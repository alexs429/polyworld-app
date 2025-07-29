const { getFirestore } = require("firebase-admin/firestore");
const db = getFirestore();

async function logSymbolicEvent(uid, token, action, metadata = {}) {
  try {
    const ref = db.collection("symbolic_events").doc();
    await ref.set({
      uid,
      token,
      action,
      metadata,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error("Failed to log symbolic event:", error);
  }
}

module.exports = { logSymbolicEvent };
