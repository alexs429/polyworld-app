const { getFirestore } = require("firebase-admin/firestore");
const db = getFirestore();

async function listTokens() {
  try {
    const snap = await db.collection("tokens").get();
    return snap.docs.map(doc => ({
      symbol: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error("Error listing tokens:", error);
    throw error;
  }
}

module.exports = { listTokens };
