const admin = require("firebase-admin");

let cachedConfig = null;

async function getSystemConfig() {
  if (cachedConfig) return cachedConfig;

  const configRef = admin.firestore().doc("system/config");
  const doc = await configRef.get();

  if (!doc.exists) {
    throw new Error("⚠️ system/config document is missing.");
  }

  cachedConfig = doc.data();
  return cachedConfig;
}

module.exports = {
  getSystemConfig
};
