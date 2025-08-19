// File: functions/utils/agentConfig.js

function getAgentConfig(type) {
  const location = "global";
  switch (type) {
    case "travel":
      return {
        projectId: "polyworld-2f581",
        agentId: "7776b620-5183-440e-8ec7-65912c072979",
        location
      };
    case "finance":
      return {
        projectId: "polyworld-2f581",
        agentId: "8a328678-b767-47ba-962e-583eb0cb61e9",
        location
      };
    case "psych", "psychologist":
      return {
        projectId: "polyworld-2f581",
        agentId: "fd5c4cc7-a36a-4d3c-8837-c70e6e81ccf7",
        location
      };
    default:
      return {
        projectId: "polyworld-2f581",
        agentId: "8870deba-11df-47af-a0ee-5096c0675396",
        location
      };
  }
}

module.exports = { getAgentConfig };
