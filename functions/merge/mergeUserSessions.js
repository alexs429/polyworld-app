const functions = require("firebase-functions");
const admin = require("firebase-admin");
const cors = require("cors")({ origin: true });

const db = admin.firestore();

exports.mergeUserSessions = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    try {
      const { internal, metamask } = req.body;

      if (!internal || !metamask) {
        return res.status(400).json({ error: "Missing internal or metamask address" });
      }

      const from = internal.toLowerCase();
      const to = metamask.toLowerCase();

      const batch = db.batch();
      const collectionsToMerge = ["tokens", "conversations", "summaries", "events"];

      let totalMerged = 0;

      for (const collection of collectionsToMerge) {
        const fromRef = db.collection("users").doc(from).collection(collection);
        const toRef = db.collection("users").doc(to).collection(collection);

        const snapshot = await fromRef.get();

        snapshot.forEach(doc => {
          const data = doc.data();

          // For tokens, merge balances
          if (collection === "tokens") {
            batch.set(
              toRef.doc(doc.id),
              {
                ...data,
                balance: admin.firestore.FieldValue.increment(data.balance || 0),
              },
              { merge: true }
            );
          } else {
            // For logs/summaries/events: just copy document as-is
            batch.set(toRef.doc(doc.id), data, { merge: true });
          }

          // Delete original document
          batch.delete(fromRef.doc(doc.id));
        });

        totalMerged += snapshot.size;
      }

      // Delete root user doc if empty
      batch.delete(db.collection("users").doc(from));

      await batch.commit();

      res.status(200).json({ success: true, merged: totalMerged });
    } catch (error) {
      console.error("❌ mergeUserSessions failed:", error);
      res.status(500).json({ error: "Internal error during merge" });
    }
  });
});
