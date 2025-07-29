const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { logTransaction } = require('../../utils/logTransaction');

exports.mintToken = functions.https.onRequest(async (req, res) => {
  try {
    const { userId, tokenId, amount, reason } = req.body;
    const db = admin.firestore();

    if (!userId || !tokenId || !amount || amount <= 0) {
      return res.status(400).send({ error: 'Invalid input parameters' });
    }

    // Fetch token metadata and check totalSupply
    const tokenDocRef = db.collection('tokens').doc(tokenId);
    const tokenSnap = await tokenDocRef.get();

    if (!tokenSnap.exists) {
      return res.status(404).send({ error: 'Token metadata not found' });
    }

    const tokenData = tokenSnap.data();
    if (!tokenData.mintAuthority?.includes(userId)) {
        return res.status(403).send({ error: 'Unauthorized mint attempt' });
    }
    const currentMinted = tokenData.currentMinted || 0;

    if (currentMinted + amount > tokenData.totalSupply) {
      return res.status(400).send({ error: 'Minting exceeds total supply limit' });
    }

    // Update balance
    const balanceQuery = await db.collection('balances')
      .where('userId', '==', userId)
      .where('tokenId', '==', tokenId)
      .get();

    if (!balanceQuery.empty) {
      const balanceDoc = balanceQuery.docs[0];
      const balanceData = balanceDoc.data();

      await balanceDoc.ref.update({
        totalBalance: balanceData.totalBalance + amount,
        withdrawableBalance: balanceData.withdrawableBalance + amount,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    } else {
      const newBalance = {
        userId,
        tokenId,
        totalBalance: amount,
        withdrawableBalance: amount,
        lockedBalance: 0,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };
      await db.collection('balances').add(newBalance);
    }

    // Increment currentMinted on the token
    await tokenDocRef.update({
      currentMinted: admin.firestore.FieldValue.increment(amount)
    });

    // Log transaction
    await logTransaction({
      tokenId,
      from: null,
      to: userId,
      amount,
      type: 'mint',
      initiatedBy: 'mintToken',
      metadata: { reason }
    });

    res.status(200).send({ message: 'Tokens minted successfully' });

  } catch (error) {
    console.error('Error minting tokens:', error);
    res.status(500).send({ error: 'Failed to mint tokens' });
  }
});
