// File: functions/utils/agentConfig.js

function getAgentConfig(type) {
  const location = "global";
  switch (type) {
    case "travel":
      return {
        projectId: "poliworld-f165b",
        agentId: "3b598560-d039-480c-80c1-c5c4a040e8d5",
        location
      };
    case "finance":
      return {
        projectId: "poliworld-f165b",
        agentId: "7e9512d2-6bcd-44a7-95f0-c72840afd971",
        location
      };
    case "psych", "psychologist":
      return {
        projectId: "poliworld-f165b",
        agentId: "a3130420-8639-457f-bb5f-257d43f6858a",
        location
      };
    default:
      return {
        projectId: "poliworld-f165b",
        agentId: "c2608e3f-55c3-4ef8-b9b6-3b96104c2d8a",
        location
      };
  }
}

module.exports = { getAgentConfig };
