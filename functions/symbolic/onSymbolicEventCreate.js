const { onDocumentCreated } = require("firebase-functions/firestore");
const functions = require("firebase-functions");
const admin = require("firebase-admin");

if (!admin.apps.length) {
  admin.initializeApp();
}

exports.onSymbolicEventCreate = onDocumentCreated("symbolic_events/{eventId}", async (event) => {
  const snap = event.data;
  if (!snap) return null;

  const data = snap.data();
  const { uid, token, action } = data;

  functions.logger.info(`🔮 New symbolic event: ${token} / ${action} for ${uid}`, {
    uid,
    token,
    action,
    metadata: data.metadata || {},
  });

  return null;
});
