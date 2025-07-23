// File: functions/utils/dialogflow.js

const axios = require('axios');
const dotenv = require('dotenv');
dotenv.config(); // ← place this safely, not repeatedly in modules

const DIALOGFLOW_WEBHOOK = process.env.DIALOGFLOW_WEBHOOK_URL || 'https://dialogflow.googleapis.com/v3/projects/YOUR_PROJECT_ID/locations/global/agents/YOUR_AGENT_ID/sessions';

exports.sendToDialogflow = async (userAddress, message) => {
  const sessionId = userAddress.slice(2, 10); // Example: deterministic session ID

  // Replace with actual Dialogflow CX request structure
  const response = await axios.post(`${DIALOGFLOW_WEBHOOK}/${sessionId}:detectIntent`, {
    queryInput: {
      text: {
        text: message,
        languageCode: 'en'
      }
    }
  }, {
    headers: {
      Authorization: `Bearer ${process.env.DIALOGFLOW_TOKEN}`,
      'Content-Type': 'application/json'
    }
  });

  return response.data.fulfillmentText || 'No response';
};
