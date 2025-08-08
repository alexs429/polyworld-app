const functions = require("firebase-functions");
const cors = require("cors")({ origin: true });
const { db } = require('../utils/firebase');

exports.mergeUserSessions = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    try {
      const { internal, metamask } = req.body;

      if (!internal || !metamask) {
        return res.status(400).json({ error: "Missing internal or metamask address" });
      }

      const from = internal.toLowerCase();
      const to = metamask.toLowerCase();

      const collectionsToMerge = ["tokens", "conversations", "summaries", "events"];
      const batch = db.batch();
      let totalMerged = 0;

      for (const collection of collectionsToMerge) {
        const fromRef = db.collection("users").doc(from).collection(collection);
        const toRef = db.collection("users").doc(to).collection(collection);
        const snapshot = await fromRef.get();

        for (const doc of snapshot.docs) {
          const tokenId = doc.id;
          const data = doc.data();

          if (collection === "tokens") {
            // Manually merge balances
            const toDocRef = toRef.doc(tokenId);
            const toDoc = await toDocRef.get();

            const fromBalance = data.balance || 0;
            const toBalance = (toDoc.exists && toDoc.data().balance) || 0;
            const mergedBalance = fromBalance + toBalance;
            console.log("mergedBalance:", mergedBalance);
            // Merge metadata too
            const mergedData = {
              ...toDoc.exists ? toDoc.data() : {},
              ...data,
              balance: mergedBalance,
            };

            batch.set(toDocRef, mergedData, { merge: true });
          } else {
            // For non-token collections, copy as-is
            batch.set(toRef.doc(tokenId), data, { merge: true });
          }

          // Clean up original document
          batch.delete(fromRef.doc(tokenId));
        }

        totalMerged += snapshot.size;
      }

      // Delete user root doc (optional cleanup)
      batch.delete(db.collection("users").doc(from));

      await batch.commit();

      res.status(200).json({
        success: true,
        merged: totalMerged,
        message: `Merged ${totalMerged} documents from ${from} → ${to}`,
      });
    } catch (error) {
      console.error("❌ mergeUserSessions failed:", error);
      res.status(500).json({ error: "Internal error during merge" });
    }
  });
});
