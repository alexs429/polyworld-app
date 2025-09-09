const functions = require("firebase-functions");
const admin = require("firebase-admin");
const cors = require("cors")({ origin: true });
const { uploadToLighthouse } = require("../utils/nftUtils");

exports.finalizeEmberTraining = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    try {
      const { flameId, emberId } = req.body;
      if (!flameId || !emberId) {
        return res.status(400).send({ error: "Missing flameId or emberId" });
      }

      const db = admin.firestore();
      const emberRef = db.doc(`embers/${emberId}`);
      const tokenRef = db.doc(`users/${flameId}/tokens/POLISTAR`);

      // Fetch Ember
      const emberSnap = await emberRef.get();
      if (!emberSnap.exists) {
        return res.status(404).send({ error: "Ember not found" });
      }
      const ember = emberSnap.data();

      // Idempotency check
      if (ember.status === "active" && ember.public === true) {
        return res.send({
          ok: true,
          action: "EMBER_TRAINING_FINALIZE",
          emberId,
          message: "Ember already finalized",
          remainingBalance: (await tokenRef.get()).data()?.balance || 0,
          ipfs: {
            image: ember.imageIpfs || null,
            metadata: ember.media?.metadataIpfs || null,
          },
          nft: ember.nft || null,
          newDraft: null,
        });
      }

      // Get POLISTAR balance
      const tokenSnap = await tokenRef.get();
      const balance = tokenSnap.exists ? tokenSnap.data().balance || 0 : 0;
      if (balance < 100) {
        return res.status(400).send({ error: "Insufficient POLISTAR balance" });
      }

      // Deduct 100 POLISTAR
      await tokenRef.update({ balance: balance - 100 });

      await db.collection("transactions").add({
        type: "EMBER_TRAINING_FINALIZE",
        amount: 100,
        from: flameId,
        token: "POLISTAR",
        emberId,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Ensure IPFS references
      let { imageIpfs, media } = ember;
      if (!imageIpfs || !media?.metadataCid) {
        const { imageCid, metadataCid } = await uploadToLighthouse(ember);
        imageIpfs = imageCid;
        await emberRef.update({
          imageIpfs,
          "media.metadataCid": metadataCid,
          "media.metadataIpfs": `ipfs://${metadataCid}`,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        media = { ...media, metadataCid };
      }

      // Update Ember to active + public
      await emberRef.update({
        status: "active",
        public: true,
        finalizedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Check if Flame still has ≥100 POLISTAR → create new draft
      const updatedSnap = await tokenRef.get();
      const updatedBalance = updatedSnap.data().balance || 0;

      let newDraft = null;
      if (updatedBalance >= 100) {
        const draftRef = await db.collection("embers").add({
          trainer: flameId,
          status: "empty",
          public: false,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        newDraft = draftRef.id;
      }

      return res.send({
        ok: true,
        action: "EMBER_TRAINING_FINALIZE",
        emberId,
        message: "Ember finalized successfully",
        remainingBalance: updatedBalance,
        ipfs: {
          image: imageIpfs || null,
          metadata: media?.metadataIpfs || null,
        },
        nft: ember.nft || null,
        newDraft,
      });
    } catch (e) {
      console.error("❌ finalizeEmberTraining error", e);
      res.status(500).send({ error: e.message });
    }
  });
});
