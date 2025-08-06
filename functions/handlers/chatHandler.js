// File: functions/handlers/chatHandler.js
const functions = require("firebase-functions");
const cors = require("cors")({ origin: true }); // Enable all origins for now
const { verifyWallet } = require("../utils/blockchain");
const { storeSession } = require("../utils/firestore");
const { sendToDialogflow } = require("../utils/dialogflow");
const { getAgentConfig } = require("../utils/agentConfig");

exports.chatHandler = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    try {
      const { userAddress, message, sessionId, ember } = req.body;

      const agentConfig = getAgentConfig(ember || "polistar");

      // Validate input
      if (!sessionId || !message) {
        return res
          .status(400)
          .json({ error: "Missing userAddress or message" });
      }

      // Optional: verify MetaMask signature or auth if required
      if (userAddress) {
        const verified = await verifyWallet(userAddress);
        if (!verified) {
          return res.status(401).json({ error: "Wallet not verified" });
        }
      }

      // Get AI-generated response from Dialogflow CX
      let reply;
      try {
        reply = await sendToDialogflow(sessionId, message, agentConfig);
      } catch (err) {
        console.error("❌ Ember agent failed, falling back to POLISTAR", err);
        const fallbackConfig = getAgentConfig("polistar");
        reply = await sendToDialogflow(sessionId, message, fallbackConfig);
      }

      // Log message and reply
      await storeSession(sessionId, message, reply);

      return res.status(200).json({ reply });
    } catch (err) {
      console.error("🔥 chatHandler error:", err);
      return res.status(500).json({ error: "Internal Server Error" });
    }
  });
});
