const admin = require('firebase-admin');
const { logTransaction } = require('../../utils/logTransaction');
const functions = require('firebase-functions');

exports.burnToken = functions.https.onRequest(async (req, res) => {
  try {
    const { userId, tokenId, amount, reason } = req.body;
    const db = admin.firestore();

    if (!userId || !tokenId || !amount || amount <= 0) {
      return res.status(400).send({ error: 'Invalid input parameters' });
    }

    const balanceQuery = await db.collection('balances')
      .where('userId', '==', userId)
      .where('tokenId', '==', tokenId)
      .get();

    if (balanceQuery.empty) {
      return res.status(404).send({ error: 'Balance record not found' });
    }

    const balanceDoc = balanceQuery.docs[0];
    const balanceData = balanceDoc.data();

    if (balanceData.withdrawableBalance < amount) {
      return res.status(400).send({ error: 'Insufficient balance to burn' });
    }

    await balanceDoc.ref.update({
      totalBalance: balanceData.totalBalance - amount,
      withdrawableBalance: balanceData.withdrawableBalance - amount,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    await logTransaction({
      tokenId,
      from: userId,
      to: null,
      amount,
      type: 'burn',
      initiatedBy: 'burnToken',
      metadata: { reason }
    });

    res.status(200).send({ message: 'Tokens burned successfully' });
  } catch (error) {
    console.error('Error burning tokens:', error);
    res.status(500).send({ error: 'Failed to burn tokens' });
  }
});
