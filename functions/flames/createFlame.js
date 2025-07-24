// Central export for Polyworld Firebase Cloud Functions
const functions = require('firebase-functions');
const { db } = require('../utils/firebase');

exports.createFlame = functions.https.onRequest(async (req, res) => {
  const data = req.body;
  if (!data || !data.walletAddress) return res.status(400).send('Missing data');

  const ref = db.collection('flames').doc(data.walletAddress);
  await ref.set(data);
  res.status(201).send('Flame created');
});
