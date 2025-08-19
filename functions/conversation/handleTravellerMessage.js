const functions = require("firebase-functions");
const { getFirestore } = require("firebase-admin/firestore");
const { SessionsClient } = require("@google-cloud/dialogflow-cx").v3;
const { v4: uuidv4 } = require("uuid");

exports.handleTravellerMessage = functions.https.onCall(async (data, context) => {
  const { uid, message } = data;
  const db = getFirestore();

  // 🌟 Default to Polistar
  let projectId = "polyworld-2f581";
  let location = "australia-southeast1";
  let agentId = "YOUR_POLISTAR_AGENT_ID"; // <- replace with your actual Polistar agent ID
  let sessionId = uid;

  // 🔥 Check if Ember session is active
  const sessionRef = db.collection("users").doc(uid).collection("session").doc("active");
  const sessionSnap = await sessionRef.get();

  if (sessionSnap.exists) {
    const sessionData = sessionSnap.data();
    if (sessionData.emberId) {
      const emberRef = db.collection("embers").doc(sessionData.emberId);
      const emberSnap = await emberRef.get();
      if (emberSnap.exists) {
        const emberData = emberSnap.data();
        ({ projectId, location, agentId } = emberData.dialogflow);
        sessionId = sessionData.sessionId || uuidv4();
      }
    }
  }

  // 🔗 Dialogflow CX client
  const client = new SessionsClient();
  const sessionPath = client.projectLocationAgentSessionPath(projectId, location, agentId, sessionId);

  const request = {
    session: sessionPath,
    queryInput: {
      text: {
        text: message,
      },
      languageCode: "en",
    },
  };

  const [response] = await client.detectIntent(request);
  const messages = response.queryResult.responseMessages;

  // 🧠 Handle text or payload
  let reply = "[No response from Ember]";
  for (const msg of messages) {
    if (msg.text?.text?.length > 0) {
      reply = msg.text.text[0];
      break;
    }
    if (msg.payload?.fields?.reply?.stringValue) {
      reply = msg.payload.fields.reply.stringValue;
      break;
    }
  }

  return { reply };
});
