// Central export for Polyworld Firebase Cloud Functions
const functions = require('firebase-functions');
const { db } = require('../utils/firebase');

// 🧭 Travellers (users)
const getTravellerByIdHandler = functions.https.onRequest(async (req, res) => {
  const id = req.query.id;
  if (!id) return res.status(400).send('Missing id');
  const doc = await db.collection('travellers').doc(id).get();
  if (!doc.exists) return res.status(404).send('Traveller not found');
  res.status(200).json(doc.data());
});

module.exports = {
  getTravellerById: getTravellerByIdHandler
};