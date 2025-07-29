// File: functions/handlers/chatHandler.js
const functions = require('firebase-functions');
const { verifyWallet } = require('../utils/blockchain');
const { storeSession } = require('../utils/firestore');
const { sendToDialogflow } = require('../utils/dialogflow');

exports.chatHandler = functions.https.onRequest(async (req, res) => {
  try {
    const { userAddress, message } = req.body;

    // Validate input
    if (!userAddress || !message) {
      return res.status(400).json({ error: 'Missing userAddress or message' });
    }

    // Optional: verify MetaMask signature or auth if required
    const verified = await verifyWallet(userAddress);
    if (!verified) {
      return res.status(401).json({ error: 'Wallet not verified' });
    }

    // Get AI-generated response from Dialogflow CX
    const reply = await sendToDialogflow(userAddress, message);

    // Log message and reply
    await storeSession(userAddress, message, reply);

    return res.status(200).json({ reply });
  } catch (err) {
    console.error('🔥 chatHandler error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});
