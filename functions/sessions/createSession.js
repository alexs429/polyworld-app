// Central export for Polyworld Firebase Cloud Functions
const functions = require('firebase-functions');
const { db } = require('../utils/firebase');

exports.createSession = functions.https.onRequest(async (req, res) => {
  const { userId, isFlameSession, messages } = req.body;
  if (!userId || !messages) return res.status(400).send('Missing fields');

  const ref = await db.collection('sessions').add({
    userId,
    isFlameSession: isFlameSession || false,
    messages,
    startedAt: admin.firestore.Timestamp.now(),
    summaryGenerated: false
  });
  res.status(201).send(`Session created with ID: ${ref.id}`);
});