const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { Timestamp } = require('firebase-admin/firestore');

admin.initializeApp();
const db = admin.firestore();

exports.testFirestore = functions.https.onRequest(async (req, res) => {
  try {
    const testDocRef = db.collection('test').doc('ping');
    await testDocRef.set({ message: 'pong', timestamp: Timestamp.now() });
    const doc = await testDocRef.get();

    res.send({ success: true, data: doc.data() });
  } catch (e) {
    console.error('Firestore test failed:', e);
    res.status(500).send({ success: false, error: e.message });
  }
});