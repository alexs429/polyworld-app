const functions = require("firebase-functions");
const admin = require("firebase-admin");
const cors = require("cors")({ origin: true });
const { burnPoli } = require("../utils/burnPoli");
const { logTransaction } = require("../utils/logTransaction");
const { mintPoli } = require("../utils/mintPoli");
const { getTokenMetadata } = require("../utils/getTokenMetadata");
const { logSymbolicEvent } = require("../utils/logSymbolicEvent");

exports.bridgeToken = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    try {
      const { userId, tokenId, amount, toAsset, bridgeDirection } = req.body;
      const db = admin.firestore();
      const toNum = (v) => (v == null || v === "" ? 0 : Number(v));

      if (
        !userId ||
        !tokenId ||
        !amount ||
        amount <= 0 ||
        !toAsset ||
        !bridgeDirection
      ) {
        return res.status(400).send({ error: "Missing or invalid parameters" });
      }

      const metadata = await getTokenMetadata(tokenId);
      if (!metadata?.swappable) {
        return res.status(403).send({ error: "This token is not swappable." });
      }

      if (metadata?.symbolic) {
        await logSymbolicEvent(
          userId,
          tokenId,
          "symbolic-bridge-" + bridgeDirection,
          {
            toAsset,
            bridgeDirection,
            amount,
            notes: "No balance change – symbolic only",
          }
        );

        return res
          .status(200)
          .send({ status: "symbolic", message: "Symbolic event logged." });
      }

      const tokenRef = db
        .collection("users")
        .doc(userId)
        .collection("tokens")
        .doc(tokenId);
      const tokenSnap = await tokenRef.get();

      if (!tokenSnap.exists) {
        return res.status(404).send({ error: "User token balance not found" });
      }

      const balanceData = tokenSnap.data();
      let txHash = null;

      if (bridgeDirection === "toEVM") {
        // POLISTAR → POLI
        if ((balanceData.withdrawableBalance || 0) < amount) {
          return res
            .status(400)
            .send({ error: "Insufficient withdrawable balance" });
        }

        await tokenRef.update({
          balance: (toNum(balanceData.balance) || 0) - amount,
          withdrawableBalance: (toNum(balanceData.withdrawableBalance) || 0) - amount,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        txHash = await mintPoli(userId, amount.toString());
      }

      if (bridgeDirection === "fromEVM") {
        try {
          txHash = await burnPoli(userId, amount); // burns directly from user
        } catch (err) {
          return res
            .status(500)
            .send({ error: "POLI burn failed: " + err.message });
        }

        await tokenRef.update({
          balance: (toNum(balanceData.balance) || 0) + amount,
          withdrawableBalance: (toNum(balanceData.withdrawableBalance) || 0) + amount,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }

      const bridgeData = {
        userId,
        fromToken: tokenId,
        toToken: toAsset,
        direction: bridgeDirection,
        amount,
        swapRate: 1,
        txHash: txHash || null,
        status: "completed",
        initiatedAt: admin.firestore.FieldValue.serverTimestamp(),
        completedAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      const bridgeDoc = await db.collection("bridges").add(bridgeData);

      await logTransaction({
        tokenId,
        from: bridgeDirection === "toEVM" ? userId : null,
        to: bridgeDirection === "fromEVM" ? userId : null,
        amount,
        type: bridgeDirection === "toEVM" ? "bridge_out" : "bridge_in",
        initiatedBy: "bridgeToken",
        metadata: { toAsset },
      });

      return res.status(200).send({
        message: "Bridge request processed",
        bridgeId: bridgeDoc.id,
        txHash,
        status: "completed",
      });
    } catch (error) {
      console.error("🔥 Error in bridgeToken:", error);
      return res.status(500).send({ error: "Failed to bridge token" });
    }
  });
});
