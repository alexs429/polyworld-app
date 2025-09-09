const admin = require("firebase-admin");

if (!admin.apps.length) {
  admin.initializeApp({
    // keep it configurable, but default to your known bucket
    storageBucket: process.env.FB_STORAGE_BUCKET || "polyworld-2f581.appspot.com",
  });
}

module.exports = admin;