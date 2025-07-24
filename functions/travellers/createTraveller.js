const functions = require('firebase-functions');
const { db } = require('../utils/firebase');

exports.createTraveller = functions.https.onRequest(async (req, res) => {
  const { walletAddress, userName, isGuest, tokenBalance, subscriptionType } = req.body;

  if (!walletAddress || !userName) {
    return res.status(400).send('Missing required fields: walletAddress or userName');
  }

  const travellerRef = db.collection('travellers').doc(walletAddress);

  const travellerDoc = {
    walletAddress,
    userName,
    isGuest: isGuest ?? false,
    tokenBalance: tokenBalance ?? 0,
    subscriptionType: subscriptionType ?? 'none',
    createdAt: Date.now()
  };

  await travellerRef.set(travellerDoc);
  res.status(201).send({ id: walletAddress, ...travellerDoc });
});