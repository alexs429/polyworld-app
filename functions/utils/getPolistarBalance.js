const functions = require('firebase-functions');
const admin = require('firebase-admin');
const cors = require('cors')({ origin: true });


exports.getPolistarBalance = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    try {
      const { address } = req.body;
      // Your logic to retrieve balance, e.g.:
      const poliAmount = await admin.firestore()
        .collection('balances')
        .doc(address)
        .get()
        .then(doc => doc.exists ? doc.data().poli : 0);

      res.json({ amount: poliAmount });
    } catch (err) {
      console.error('getPoliBalance failed:', err);
      res.status(500).send('Failed to retrieve balance');
    }
  });
});
