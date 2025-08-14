export const GCF = "https://us-central1-poliworld-f165b.cloudfunctions.net";
export const ENDPOINTS = {
  getPoliBalance: `${GCF}/getPoliBalance`,
  getUsdtBalance: `${GCF}/getUsdtBalance`,
  getPolistarBalance: `${GCF}/getPolistarBalance`,
  chatHandler: `${GCF}/chatHandler`,
  authenticateMetamask: `${GCF}/authenticateMetamask`,
  mergeUserSessions: `${GCF}/mergeUserSessions`,
  rewardPolistar: `${GCF}/rewardPolistar`,
  getPoliRate: `${GCF}/getPoliRate`,
  buyPoli: `${GCF}/buyPoliFromUsdt`,
  buildApproveUsdtTx: `${GCF}/buildApproveUsdtTx`,
  bridgeToken: `${GCF}/bridgeToken`,
  transferPolistar: `${GCF}/transferPolistar`,
  burnToken: `${GCF}/burnToken`,
};

export const DEV = {
  POLI_PER_USDT: 10, // fallback rate (1 USDT => 10 POLI, change as you like)
  SIMULATE_BUY_POLI: false, // simulate success if no endpoint / CORS fails
  SIMULATE_TRANSFER_POLISTAR: false,
};
