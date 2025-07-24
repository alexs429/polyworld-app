// Central export for Polyworld Firebase Cloud Functions
const functions = require('firebase-functions');
const { db } = require('../utils/firebase');

// 🔥 Flames (creators)
exports.getFlameById = functions.https.onRequest(async (req, res) => {
  const id = req.query.id;
  if (!id) return res.status(400).send('Missing id');

  const doc = await db.collection('flames').doc(id).get();
  if (!doc.exists) return res.status(404).send('Flame not found');

  res.status(200).json(doc.data());
});