// File: functions/utils/dialogflow.js
const { v4: uuidv4 } = require("uuid");
const { SessionsClient } = require("@google-cloud/dialogflow-cx");

exports.sendToDialogflow = async (sessionId, message, agentConfig, emberPersona = null) => {
  console.log("💬 sendToDialogflow called");

  try {
    // Pull agent config from parameter, with fallback to env
    const {
      projectId = process.env.DFX_PROJECT_ID,
      location = process.env.DFX_LOCATION || "global",
      agentId = process.env.DFX_AGENT_ID,
    } = agentConfig || {};

    const languageCode = "en";
    const resolvedSessionId = sessionId || uuidv4();

    const sessionClient = new SessionsClient({
      apiEndpoint: `${location}-dialogflow.googleapis.com`,
    });

    console.log("📍 DFX Config at runtime:", {
      projectId,
      location,
      agentId,
      sessionId: resolvedSessionId,
    });

    const sessionPath = sessionClient.projectLocationAgentSessionPath(
      projectId,
      location,
      agentId,
      resolvedSessionId
    );

    // 🔹 Build persona payload (safe defaults if not provided)
    const personaParams = emberPersona
      ? {
          persona_tagline: emberPersona.tagline || "",
          persona_longBio: emberPersona.longBio || "",
          persona_tone: emberPersona.tone || "",
          persona_description: emberPersona.description || "",
          persona_full: `You are ${emberPersona.description}. Speak in a ${emberPersona.tone} style. Bio: ${emberPersona.longBio}`,
        }
      : {};

    const request = {
      session: sessionPath,
      queryInput: {
        text: { text: message },
        languageCode,
      },
      queryParams: {
        parameters: personaParams, // ✅ safe empty object if none
      },
    };

    const [response] = await sessionClient.detectIntent(request);

    // Extract usable reply
    const messages = response.queryResult?.responseMessages || [];
    let reply = "[No response from Polistar]";

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

    // ✅ Add support for $request.generative as a fallback
    if (
      reply === "[No response from Polistar]" ||
      reply === "$request.generative"
    ) {
      const generative =
        response.queryResult?.parameters?.fields?.request?.structValue?.fields
          ?.generative?.stringValue;

      if (generative) {
        reply = generative;
      }
    }

    return reply;
  } catch (err) {
    console.error("🔥 sendToDialogflow error:", err.message, err);
    return `[Error: ${err.message}]`;
  }
};
