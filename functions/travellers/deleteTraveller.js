// Central export for Polyworld Firebase Cloud Functions
const functions = require('firebase-functions');
const { db } = require('../utils/firebase');

exports.deleteTraveller = functions.https.onRequest(async (req, res) => {
  const id = req.query.id;
  if (!id) return res.status(400).send('Missing id');

  await db.collection('travellers').doc(id).delete();
  res.status(200).send('Traveller deleted');
});