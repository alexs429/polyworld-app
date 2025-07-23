// File: functions/handlers/chatHandler.js

const { verifyWallet } = require('../utils/blockchain');
const { storeSession } = require('../utils/firestore');
const { sendToDialogflow } = require('../utils/dialogflow');

exports.chatHandler = async (req, res) => {
  try {
    const { userAddress, message } = req.body;

    if (!userAddress || !message) {
      return res.status(400).send('Missing parameters');
    }

    const verified = await verifyWallet(userAddress);
    if (!verified) return res.status(401).send('Wallet not verified');

    const reply = await sendToDialogflow(userAddress, message);
    await storeSession(userAddress, message, reply);

    res.send({ reply });
  } catch (e) {
    console.error(e);
    res.status(500).send('Internal Server Error');
  }
};