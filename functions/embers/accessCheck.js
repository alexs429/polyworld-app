const { getSystemConfig } = require("../utils/config");
const { refreshBalances } = require("../balances/refreshBalances");

async function canAccessEmbers(address) {
  if (!address) throw new Error("Missing wallet address");

  const config = await getSystemConfig();
  const threshold = config.emberThresholdPolistars || 10;

  const balances = await refreshBalances(address);
  const hasEnough = (balances?.polistar ?? 0) >= threshold;

  return {
    accessGranted: hasEnough,
    current: balances.polistar,
    required: threshold
  };
}

module.exports = {
  canAccessEmbers
};
