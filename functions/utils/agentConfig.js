// functions/utils/agentConfig.js
const admin = require("firebase-admin");
try { admin.initializeApp(); } catch (_) {}
const { getFirestore } = require("firebase-admin/firestore");

// map short aliases to doc ids
const ALIASES = { psych: "psychologist" };

const PROJECT_ID =
  process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT || "polyworld-2f581";
const DEFAULT_CFG = {
  projectId: PROJECT_ID,
  agentId: "8870deba-11df-47af-a0ee-5096c0675396", // your current default
  location: "global",
  languageCode: "en",
};

// simple in-memory cache with TTL
const cache = new Map(); // key: emberId, value: { t:number, cfg:AgentCfg }
const TTL_MS = 60 * 1000; // 60s; tweak as you like

function normalizeId(type) {
  if (!type) return null;
  const t = String(type).toLowerCase();
  return ALIASES[t] || t;
}

/**
 * Load Dialogflow agent config for an ember from Firestore.
 * Returns { projectId, agentId, location, languageCode }.
 */
async function getAgentConfig(type) {
  const emberId = normalizeId(type);
  if (!emberId) return DEFAULT_CFG;

  const now = Date.now();
  const hit = cache.get(emberId);
  if (hit && now - hit.t < TTL_MS) return hit.cfg;

  try {
    const snap = await getFirestore().collection("embers").doc(emberId).get();
    if (!snap.exists) {
      // cache the default briefly to avoid repeated misses
      cache.set(emberId, { t: now, cfg: DEFAULT_CFG });
      return DEFAULT_CFG;
    }
    const d = snap.data() || {};
    const agentId = d?.dialogflow?.agentId;
    const location = d?.dialogflow?.location || "global";
    const languageCode = d?.dialogflow?.languageCode || "en";

    const cfg = agentId
      ? { projectId: PROJECT_ID, agentId, location, languageCode }
      : DEFAULT_CFG;

    cache.set(emberId, { t: now, cfg });
    return cfg;
  } catch (err) {
    console.error("[agentConfig] load failed:", err);
    return DEFAULT_CFG;
  }
}

// optional helper for tests / hot reloads
function _clearAgentConfigCache() { cache.clear(); }

module.exports = { getAgentConfig, _clearAgentConfigCache };
