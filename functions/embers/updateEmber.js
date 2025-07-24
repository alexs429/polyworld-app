// Central export for Polyworld Firebase Cloud Functions
const functions = require('firebase-functions');
const { db } = require('../utils/firebase');

exports.updateEmber = functions.https.onRequest(async (req, res) => {
  const id = req.query.id;
  if (!id) return res.status(400).send('Missing ember ID');
  await db.collection('embers').doc(id).update(req.body);
  res.status(200).send('Ember updated');
});