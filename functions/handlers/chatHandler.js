const functions = require("firebase-functions");
const cors = require("cors")({ origin: true });
const { verifyWallet } = require("../utils/blockchain");
const { storeSession } = require("../utils/firestore");
const { sendToDialogflow } = require("../utils/dialogflow");
const { getAgentConfig } = require("../utils/agentConfig");

exports.chatHandler = functions.https.onRequest((req, res) => {
  return cors(req, res, async () => {
    try {
      if (req.method === "OPTIONS") {
        return res.status(204).end();
      }
      if (req.method !== "POST") {
        return res.status(405).json({ error: "Use POST" });
      }

      const { userAddress, message, sessionId, ember } = req.body || {};

      if (!sessionId || !message || !String(message).trim()) {
        return res.status(400).json({ error: "Missing sessionId or message" });
      }

      // 🔹 Load agent config (ember-specific or Polistar default)
      const agentConfig = await getAgentConfig(ember?.id || "polistar");

      // 🔹 Optional: verify wallet
      if (userAddress) {
        const verified = await verifyWallet(userAddress);
        if (!verified) {
          return res.status(401).json({ error: "Wallet not verified" });
        }
      }

      // 🔹 Persona payload (null if not available)
      const persona = ember?.persona || null;

      let reply;
      try {
        reply = await sendToDialogflow(sessionId, message, agentConfig, persona);
      } catch (err) {
        console.error("❌ Ember agent failed, falling back to POLISTAR", err);

        const fallbackConfig = await getAgentConfig("polistar");
        // 🔹 Always call with 4th param → null for Polistar
        reply = await sendToDialogflow(sessionId, message, fallbackConfig, null);
      }

      // 🔹 Persist session turn
      await storeSession(sessionId, message, reply);

      return res.status(200).json({ reply });
    } catch (err) {
      console.error("🔥 chatHandler error:", err);
      return res.status(500).json({ error: "Internal Server Error" });
    }
  });
});
