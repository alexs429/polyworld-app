const functions = require("firebase-functions");
const admin = require("firebase-admin");
const cors = require("cors")({ origin: true });
const { uploadToLighthouse, mintNFT } = require("../utils/nftUtils");

exports.mintEmberNFT = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    try {
      const { flameId, emberId, wallet } = req.body;
      if (!flameId || !emberId || !wallet) {
        return res
          .status(400)
          .send({ error: "Missing flameId, emberId, or wallet" });
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
      if (ember.nft?.tokenId && ember.nft?.txHash) {
        return res.send({
          ok: true,
          action: "EMBER_MINT_NFT",
          emberId,
          message: "NFT already minted",
          remainingBalance: (await tokenRef.get()).data()?.balance || 0,
          ipfs: {
            image: ember.imageIpfs || null,
            metadata: ember.media?.metadataIpfs || null,
          },
          nft: ember.nft,
        });
      }

      // Get POLISTAR balance
      const tokenSnap = await tokenRef.get();
      const balance = tokenSnap.exists ? tokenSnap.data().balance || 0 : 0;
      if (balance < 50) {
        return res.status(400).send({ error: "Insufficient POLISTAR balance" });
      }

      // Ensure IPFS references
      let { imageIpfs, media } = ember;
      let metadataCid = media?.metadataCid;

      if (!imageIpfs || !metadataCid) {
        const { imageCid, metadataCid: newMetaCid } = await uploadToLighthouse(
          ember
        );
        imageIpfs = imageCid;
        metadataCid = newMetaCid;
        await emberRef.update({
          imageIpfs,
          "media.metadataCid": metadataCid,
          "media.metadataIpfs": `ipfs://${metadataCid}`,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }

      // Deduct 50 POLISTAR
      await tokenRef.update({ balance: balance - 50 });

      await db.collection("transactions").add({
        type: "EMBER_MINT_NFT",
        amount: 50,
        from: flameId,
        token: "POLISTAR",
        emberId,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Mint NFT on-chain
      const { tokenId, txHash } = await mintNFT(wallet, metadataCid);

      // Save NFT details
      const nftData = {
        owner: wallet,
        tokenId,
        txHash,
        mintedAt: admin.firestore.FieldValue.serverTimestamp(),
      };
      await emberRef.update({ nft: nftData });

      await emberRef.update({
        nft: nftData,
        trainingProgress: {
          complete: true,
          step: 10, // or "done"
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        status: "active", // optional: mark as active Ember
      });
      
      return res.send({
        ok: true,
        action: "EMBER_MINT_NFT",
        emberId,
        message: "NFT minted successfully",
        remainingBalance: balance - 50,
        ipfs: {
          image: imageIpfs || null,
          metadata: `ipfs://${metadataCid}`,
        },
        nft: nftData,
      });
    } catch (e) {
      console.error("❌ mintEmberNFT error", e);
      res.status(500).send({ error: e.message });
    }
  });
});
