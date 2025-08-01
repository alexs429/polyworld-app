const functions = require("firebase-functions");
const { getFirestore } = require("firebase-admin/firestore");
const { ethers } = require("ethers");
const { POLI_ABI } = require("../utils/abi/POLI_ABI");

const POLI_ADDRESS = process.env.POLI_ADDRESS;
const RPC_URL = process.env.RPC_URL;
const TREASURY_PRIVATE_KEY = process.env.TREASURY_KEY;

const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
const signer = new ethers.Wallet(TREASURY_PRIVATE_KEY, provider);
const poliContract = new ethers.Contract(POLI_ADDRESS, POLI_ABI, signer);

exports.transferPoliToUser = functions.https.onCall(async (_data, context) => {
  const data = _data?.data || _data;
  const { uid, ethAddress, amount, reason } = data;

  if (!ethAddress || !amount || isNaN(amount) || Number(amount) <= 0) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Missing or invalid parameters: ethAddress, amount"
    );
  }

  try {
    const parsedAmount = ethers.utils.parseUnits(amount.toString(), 18);
    const tx = await poliContract.transfer(ethAddress, parsedAmount);
    await tx.wait();

    // Optional: Log to Firestore
    const db = getFirestore();
    await db.collection("transactions").add({
      type: "POLI_TRANSFER",
      to: ethAddress,
      amount: Number(amount),
      reason: reason || "unspecified",
      uid: uid || null,
      txHash: tx.hash,
      timestamp: new Date().toISOString(),
    });

    return { success: true, txHash: tx.hash };
  } catch (error) {
    console.error("❌ POLI transfer error:", error);
    throw new functions.https.HttpsError(
      "internal",
      "Failed to transfer POLI",
      error.message
    );
  }
});
