const admin = require('firebase-admin');
const Token = require('../schemas/token');
const functions = require('firebase-functions');

exports.createToken = functions.https.onRequest(async (req, res) => {
  try {
    const { tokenId, name, symbol, totalSupply, creator, swappable, bridge_to } = req.body;
    const db = admin.firestore();

    const newToken = new Token({
      tokenId, name, symbol, totalSupply, creator, swappable, bridge_to
    });

    await db.collection('tokens').doc(tokenId).set({ ...newToken });

    res.status(200).send({ message: 'Token created successfully', token: newToken });
  } catch (error) {
    console.error('Error creating token:', error);
    res.status(500).send({ error: 'Failed to create token' });
  }
});