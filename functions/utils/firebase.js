const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp(); // ✅ Only once!
}

const db = admin.firestore();

module.exports = { admin, db };