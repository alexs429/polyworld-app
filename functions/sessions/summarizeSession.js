const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { db } = require('../utils/firebase');

exports.summarizeSession = functions.https.onRequest(async (req, res) => {
  const id = req.query.id;
  if (!id) return res.status(400).send('Missing session ID');

  const sessionRef = db.collection('sessions').doc(id);
  const doc = await sessionRef.get();

  if (!doc.exists) return res.status(404).send('Session not found');
  const session = doc.data();
  const messages = session.messages || [];

  const summary = generateSimpleSummary(messages);

  await sessionRef.update({
    summary,
    summaryGenerated: true,
    endedAt: admin.firestore.Timestamp.now(),
    status: "completed"
  });

  res.status(200).send('Session summarized');
});

// Basic placeholder summary logic
function generateSimpleSummary(messages) {
  if (!messages || messages.length === 0) return "No conversation messages found.";

  const total = messages.length;
  const first = messages[0]?.text || "N/A";
  const last = messages[total - 1]?.text || "N/A";

  return `Summary of ${total} messages.\n- Opening: "${first}"\n- Closing: "${last}"`;
}
