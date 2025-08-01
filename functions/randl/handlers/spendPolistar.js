const functions = require("firebase-functions");
const { getFirestore } = require("firebase-admin/firestore");

exports.spendPolistar = functions.https.onCall(async (_data, context) => {
  const data = _data?.data || _data;
  const { uid, amount, sessionType } = data;

  if (!uid || !amount || isNaN(amount) || Number(amount) <= 0) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Missing or invalid parameters: uid, amount"
    );
  }

  try {
    const db = getFirestore();
    const tokenRef = db.collection("users").doc(uid).collection("tokens").doc("POLISTAR");

    await db.runTransaction(async (t) => {
      const snap = await t.get(tokenRef);
      if (!snap.exists) throw new Error("POLISTAR balance not found");

      const data = snap.data();
      const currentBalance = Number(data.balance || 0);

      if (currentBalance < amount) {
        throw new Error("Insufficient POLISTAR balance");
      }

      const newBalance = currentBalance - Number(amount);
      t.update(tokenRef, {
        balance: newBalance,
        updatedAt: new Date().toISOString()
      });
    });

    // Optional logging
    await db.collection("transactions").add({
      type: "POLISTAR_SPENT",
      uid,
      amount: Number(amount),
      sessionType: sessionType || "unspecified",
      timestamp: new Date().toISOString()
    });

    return { success: true };
  } catch (error) {
    console.error("❌ POLISTAR spend error:", error);
    throw new functions.https.HttpsError("internal", "Failed to spend POLISTAR", error.message);
  }
});
