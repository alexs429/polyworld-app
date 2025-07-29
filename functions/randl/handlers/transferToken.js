const admin = require('firebase-admin');
const functions = require('firebase-functions');
const { logTransaction } = require('../../utils/logTransaction');

exports.transferToken = functions.https.onRequest(async (req, res) => {
  try {
    const { fromUserId, toUserId, tokenId, amount } = req.body;
    const db = admin.firestore();

    if (!fromUserId || !toUserId || !tokenId || !amount || amount <= 0) {
      return res.status(400).send({ error: 'Invalid input parameters' });
    }

    const balancesRef = db.collection('balances');
    const fromQuery = await balancesRef
      .where('userId', '==', fromUserId)
      .where('tokenId', '==', tokenId)
      .get();

    if (fromQuery.empty) {
      return res.status(400).send({ error: 'Sender has no balance' });
    }

    const fromDoc = fromQuery.docs[0];
    const fromData = fromDoc.data();

    if (fromData.withdrawableBalance < amount) {
      return res.status(400).send({ error: 'Insufficient balance' });
    }

    await fromDoc.ref.update({
      totalBalance: fromData.totalBalance - amount,
      withdrawableBalance: fromData.withdrawableBalance - amount,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    const toQuery = await balancesRef
      .where('userId', '==', toUserId)
      .where('tokenId', '==', tokenId)
      .get();

    if (!toQuery.empty) {
      const toDoc = toQuery.docs[0];
      const toData = toDoc.data();
      await toDoc.ref.update({
        totalBalance: toData.totalBalance + amount,
        withdrawableBalance: toData.withdrawableBalance + amount,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    } else {
      const newBalance = {
        userId: toUserId,
        tokenId,
        totalBalance: amount,
        withdrawableBalance: amount,
        lockedBalance: 0,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };
      await balancesRef.add(newBalance);
    }

    await logTransaction({
      tokenId,
      from: fromUserId,
      to: toUserId,
      amount,
      type: 'transfer',
      initiatedBy: 'transferToken',
      metadata: {}
    });

    res.status(200).send({ message: 'Token transferred successfully' });
  } catch (error) {
    console.error('Error transferring tokens:', error);
    res.status(500).send({ error: 'Failed to transfer tokens' });
  }
});
