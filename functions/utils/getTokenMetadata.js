const { getFirestore } = require("firebase-admin/firestore");
const db = getFirestore();

async function getTokenMetadata(symbol) {
  try {
    const doc = await db.collection("tokens").doc(symbol).get();
    if (!doc.exists) return null;
    return doc.data();
  } catch (error) {
    console.error("Error fetching token metadata:", error);
    throw error;
  }
}

module.exports = { getTokenMetadata };
