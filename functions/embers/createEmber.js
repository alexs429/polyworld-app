// Central export for Polyworld Firebase Cloud Functions
const functions = require('firebase-functions');
const { db } = require('../utils/firebase');


exports.createEmber = functions.https.onRequest(async (req, res) => {
  const { flameId, name, personality, nftMetadataUrl } = req.body;

  if (!flameId || !name) {
    return res.status(400).send('Missing required fields');
  }

  const emberDoc = {
    flameId,
    name,
    personality: personality || {},
    nftMetadataUrl: nftMetadataUrl || null,
    createdAt: Date.now(),
    isPublic: false,
    summaryCount: 0,
    status: 'draft'
  };

  const ref = await db.collection('embers').add(emberDoc);
  res.status(201).send({ id: ref.id, ...emberDoc });
});