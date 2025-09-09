const functions = require("firebase-functions");
const admin = require("firebase-admin");
const cors = require("cors")({ origin: true });
const fetch = (...args) => import("node-fetch").then((m) => m.default(...args)); //const fetch = require("node-fetch");
const { v4: uuidv4 } = require("uuid");

// Initialize admin once
if (!admin.apps.length) {
  admin.initializeApp();
}

const firestore = admin.firestore();

// GCP Config
const PROJECT_ID = process.env.DFX_PROJECT_ID;
const LOCATION = process.env.DFX_LOCATION || "global";
const CX_API_BASE = `https://dialogflow.googleapis.com/v3/projects/${PROJECT_ID}/locations/${LOCATION}/agents`;

// Get OAuth token
async function getAccessToken() {
  const { GoogleAuth } = require("google-auth-library");
  const auth = new GoogleAuth({
    scopes: ["https://www.googleapis.com/auth/cloud-platform"],
  });
  const client = await auth.getClient();
  const token = await client.getAccessToken();
  return token;
}

exports.createEmberAgent = functions.https.onRequest(async (req, res) => {
  cors(req, res, async () => {
    if (req.method === "OPTIONS") {
      // 🔹 Always handle preflight
      return res.status(204).send("");
    }
    if (req.method !== "POST") {
      return res.status(405).send("Method Not Allowed");
    }

    try {
      const { firstName, lastName, focus, createdBy } = req.body;
      if (!firstName || !lastName || !focus || !createdBy) {
        return res
          .status(400)
          .json({ error: "Missing firstName, lastName, focus, or createdBy" });
      }

      // Build Firestore-friendly ID
      const emberId = `${focus.toLowerCase()}-${uuidv4().slice(0, 6)}`;

      // Build CX agent payload
      const displayName = emberId;
      const agentPayload = {
        displayName,
        defaultLanguageCode: "en",
        timeZone: "Etc/UTC",
      };

      const token = await getAccessToken();
      const cxRes = await fetch(CX_API_BASE, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token.token || token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(agentPayload),
      });

      if (!cxRes.ok) {
        const errText = await cxRes.text();
        console.error("Dialogflow CX error:", errText);
        return res.status(500).json({ error: errText });
      }

      const cxData = await cxRes.json();
      const fullAgentPath = cxData.name; // e.g. projects/.../agents/<UUID>
      const agentUuid = fullAgentPath.split("/").pop(); // just the UUID

      // Save Ember in Firestore
      await firestore
        .collection("embers")
        .doc(emberId)
        .set({
          id: emberId,
          createdBy,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          focus,
          status: "training",
          dialogflow: {
            agentId: agentUuid, // only UUID
            languageCode: "en",
            location: LOCATION,
          },
          identity: {
            firstName,
            lastName,
            identityComplete: false,
          },
          persona: { tagline: "", longBio: "" },
          pricing: { polistarPerSession: 10, sessionSeconds: 30 },
          // ✅ persist training progress for resume after refresh
          trainingProgress: {
            step: 3, // 1=Name, 2=Focus, 3=Avatar
            complete: false,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          },
        });

      return res.json({
        ok: true,
        id: emberId,
        agentId: agentUuid,
        firstName,
        lastName,
        focus,
      });
    } catch (err) {
      console.error("createEmberAgent failed:", err);
      return res.status(500).json({ error: err.message });
    }
  });
});
