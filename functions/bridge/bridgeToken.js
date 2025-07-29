const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { logTransaction } = require('../utils/logTransaction');
const { mintPoli } = require('../utils/mintPoli');
const { getTokenMetadata } = require('../utils/getTokenMetadata');
const { logSymbolicEvent } = require('../utils/logSymbolicEvent');

exports.bridgeToken = functions.https.onRequest(async (req, res) => {
  try {
    const { userId, tokenId, amount, toAsset, bridgeDirection } = req.body;
    const db = admin.firestore();

    if (!userId || !tokenId || !amount || amount <= 0 || !toAsset || !bridgeDirection) {
      return res.status(400).send({ error: 'Missing or invalid parameters' });
    }

    const metadata = await getTokenMetadata("POLISTAR");
    if (!metadata?.swappable) {
        throw new functions.https.HttpsError("permission-denied", "POLISTAR is not swappable at this time.");
    }

    if (metadata?.symbolic) {
      await logSymbolicEvent(userId, tokenId, "symbolic-bridge-in", {
        toAsset,
        bridgeDirection,
        amount,
        notes: "No balance change – symbolic only"
      });

      return res.status(200).send({ status: "symbolic", message: "Symbolic event logged." });
    }


    const balancesRef = db.collection('balances');
    const balanceQuery = await balancesRef
      .where('userId', '==', userId)
      .where('tokenId', '==', tokenId)
      .get();

    if (balanceQuery.empty) {
      return res.status(404).send({ error: 'User balance not found' });
    }

    const balanceDoc = balanceQuery.docs[0];
    const balanceData = balanceDoc.data();

    let txHash = null;

    if (bridgeDirection === 'toEVM') {
      if (balanceData.withdrawableBalance < amount) {
        return res.status(400).send({ error: 'Insufficient balance to bridge' });
      }

      // Deduct POLISTAR balance
      await balanceDoc.ref.update({
        totalBalance: balanceData.totalBalance - amount,
        withdrawableBalance: balanceData.withdrawableBalance - amount,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      // Call on-chain minting function
      txHash = await mintPoli(userId, amount.toString());
    }

    // Record bridge activity
    const bridgeData = {
      userId,
      fromToken: tokenId,
      toToken: toAsset,
      direction: bridgeDirection,
      amount,
      swapRate: 1,
      txHash: txHash || null,
      status: txHash ? 'completed' : 'pending',
      initiatedAt: admin.firestore.FieldValue.serverTimestamp(),
      completedAt: txHash ? admin.firestore.FieldValue.serverTimestamp() : null
    };

    const bridgeDoc = await db.collection('bridges').add(bridgeData);

    await logTransaction({
      tokenId,
      from: bridgeDirection === 'toEVM' ? userId : null,
      to: bridgeDirection === 'fromEVM' ? userId : null,
      amount,
      type: bridgeDirection === 'toEVM' ? 'bridge_out' : 'bridge_in',
      initiatedBy: 'bridgeToken',
      metadata: { toAsset }
    });

    res.status(200).send({
      message: 'Bridge request processed',
      bridgeId: bridgeDoc.id,
      txHash: txHash,
      status: txHash ? 'completed' : 'pending'
    });
  } catch (error) {
    console.error('Error in bridgeToken:', error);
    res.status(500).send({ error: 'Failed to bridge token' });
  }
});
