// File: functions/utils/firestore.js

const { getFirestore, Timestamp } = require('firebase-admin/firestore');
const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = getFirestore();

exports.storeSession = async (userAddress, message, reply) => {
  const sessionRef = db.collection('sessions').doc();
  await sessionRef.set({
    userAddress,
    message,
    reply,
    createdAt: Timestamp.now()
  });
};