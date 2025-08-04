const { v4: uuidv4 } = require('uuid');

exports.sendToDialogflow = async (userAddress, message) => {
  console.log("💬 sendToDialogflow called");

  try {
    const { SessionsClient } = require('@google-cloud/dialogflow-cx');

    const projectId = process.env.DFX_PROJECT_ID;
    const location = process.env.DFX_LOCATION || 'australia-southeast1';
    const agentId = process.env.DFX_AGENT_ID;
    const languageCode = 'en';

    const sessionId = userAddress.slice(2, 10);

    const sessionClient = new SessionsClient({
      apiEndpoint: `${location}-dialogflow.googleapis.com`
    });

    console.log("📍 DFX Config at runtime:", {
      projectId,
      location,
      agentId,
      sessionId
    });

    const sessionPath = sessionClient.projectLocationAgentSessionPath(
      projectId,
      location,
      agentId,
      sessionId
    );

    const request = {
      session: sessionPath,
      queryInput: {
        text: { text: message },
        languageCode,
      },
    };

    const [response] = await sessionClient.detectIntent(request);

    // Extract usable reply
    const messages = response.queryResult?.responseMessages || [];
    let reply = '[No response from Ember]';

    for (const msg of messages) {
      if (msg.text?.text?.length > 0) {
        reply = msg.text.text[0];
        break;
      }
    }

    return reply;

  } catch (err) {
    console.error("🔥 sendToDialogflow error:", err.message);
    return '[Error: Ember failed to respond]';
  }
};
