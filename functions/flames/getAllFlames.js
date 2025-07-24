// Central export for Polyworld Firebase Cloud Functions
const functions = require('firebase-functions');
const { db } = require('../utils/firebase');

exports.getAllFlames = functions.https.onRequest(async (_req, res) => {
  const snapshot = await db.collection('flames').get();
  const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  res.status(200).json(data);
});
