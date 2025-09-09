const functions = require("firebase-functions");
const admin = require("firebase-admin");
const cors = require("cors")({ origin: true });
const { uploadToLighthouse } = require("./utils/nftUtils");

exports.backfillEmberMetadataFromFirestore = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    try {
      const { emberIds } = req.body || {}; // optional: pass specific Ember IDs
      const db = admin.firestore();

      let query = db.collection("embers");
      if (emberIds && Array.isArray(emberIds) && emberIds.length > 0) {
        query = query.where(admin.firestore.FieldPath.documentId(), "in", emberIds);
      }

      const snap = await query.get();
      if (snap.empty) {
        return res.send({ ok: true, processed: 0, results: [] });
      }

      const results = [];

      for (const doc of snap.docs) {
        const emberId = doc.id;
        const ember = doc.data();

        try {
          // Skip if already has IPFS references
          if (ember.imageIpfs && ember.media?.metadataCid) {
            results.push({ id: emberId, skipped: true });
            continue;
          }

          // Upload to Lighthouse
          const { imageCid, metadataCid } = await uploadToLighthouse(ember);

          // Update Firestore
          await doc.ref.update({
            imageIpfs: imageCid,
            "media.metadataCid": metadataCid,
            "media.metadataIpfs": `ipfs://${metadataCid}`,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });

          results.push({
            id: emberId,
            imageCid,
            metadataCid,
          });
        } catch (innerErr) {
          console.error(`❌ Error processing Ember ${emberId}`, innerErr);
          results.push({ id: emberId, error: innerErr.message });
        }
      }

      return res.send({
        ok: true,
        processed: results.length,
        results,
      });
    } catch (err) {
      console.error("❌ backfillEmberMetadataFromFirestore error", err);
      res.status(500).send({ error: err.message });
    }
  });
});
