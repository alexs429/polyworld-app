const admin = require("firebase-admin");
const { ethers } = require("ethers");
const { POLI_ABI } = require("../abi/POLI_ABI");

const POLI_ADDRESS = process.env.POLI_ADDRESS;
const RPC_URL = process.env.RPC_URL;

const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
const poliContract = new ethers.Contract(POLI_ADDRESS, POLI_ABI, provider);

async function refreshBalances(address) {
  if (!address) throw new Error("Missing wallet address");

  const balanceRef = admin.firestore().doc(`polistarBalances/${address}`);
  const balanceSnap = await balanceRef.get();

  const polistarData = balanceSnap.exists ? balanceSnap.data() : {
    amount: 0,
    swappable: 0,
    withdrawable: 0
  };

  // Normalize POLISTAR values
  const polistar = Number(polistarData.amount ?? 0);
  const swappable = Number(polistarData.swappable ?? 0);
  const withdrawable = Number(polistarData.withdrawable ?? 0);

  // Fetch POLI from blockchain
  let poli = 0;
  try {
    const raw = await poliContract.balanceOf(address);
    poli = parseFloat(ethers.utils.formatUnits(raw, 18));
  } catch (err) {
    console.error("⚠️ Failed to fetch POLI from blockchain:", err);
  }

  return {
    polistar,
    swappable,
    withdrawable,
    poli
  };
}

module.exports = {
  refreshBalances
};
