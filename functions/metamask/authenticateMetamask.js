const functions = require('firebase-functions');
const { admin } = require('../firebase');
const { verifyMessage } = require('ethers');
const cors = require('cors')({ origin: true });

const db = admin.firestore();

exports.authenticateMetamask = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    try {
      const { address, message, signature } = req.body;
      console.log('🔥 Incoming auth request:', { address, message, signature });

      if (!address || !message || !signature) {
        return res.status(400).send('Missing parameters');
      }

      const recoveredAddress = verifyMessage(message, signature);
      console.log('✅ Recovered address:', recoveredAddress);

      if (recoveredAddress.toLowerCase() !== address.toLowerCase()) {
        return res.status(401).send('Signature mismatch');
      }

      const travellerRef = db.collection('travellers').doc(address);
      const travellerDoc = await travellerRef.get();

      let isNew = false;

      if (!travellerDoc.exists) {
        await travellerRef.set({
          address,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        isNew = true;
      }

      return res.status(200).json({ travellerId: address, isNew });

    } catch (err) {
      console.error('❌ Authentication error:', err);
      return res.status(500).send('Internal server error');
    }
  });
});
