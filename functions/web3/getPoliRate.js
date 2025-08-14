// functions/index.js (Firebase/Cloud Functions)
const functions = require("firebase-functions");
const cors = require("cors")({ origin: true });

exports.getPoliRate = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    if (req.method === "OPTIONS") {
      res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
      res.set("Access-Control-Allow-Headers", "Content-Type");
      return res.status(204).send("");
    }
    res.set("Access-Control-Allow-Origin", "*");
    // TODO: return your real rate
    res.json({ poliPerUsdt: 10 });
  });
});
