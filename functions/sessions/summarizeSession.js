// Central export for Polyworld Firebase Cloud Functions
const functions = require('firebase-functions');
const { db } = require('../utils/firebase');

exports.summarizeSession = functions.https.onRequest(async (req, res) => {
  const id = req.query.id;
  if (!id) return res.status(400).send('Missing session ID');

  const doc = await db.collection('sessions').doc(id).get();
  if (!doc.exists) return res.status(404).send('Session not found');

  const summary = 'This is a placeholder summary.'; // Replace with actual summarizer logic
  await db.collection('sessions').doc(id).update({
    summary,
    summaryGenerated: true
  });

  res.status(200).send('Session summarized');
});