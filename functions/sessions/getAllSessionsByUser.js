// Central export for Polyworld Firebase Cloud Functions
const functions = require('firebase-functions');
const { db } = require('../utils/firebase');

exports.getAllSessionsByUser = functions.https.onRequest(async (req, res) => {
  const userId = req.query.userId;
  if (!userId) return res.status(400).send('Missing userId');

  const snapshot = await db.collection('sessions').where('userId', '==', userId).get();
  const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  res.status(200).json(data);
});
