const functions = require("firebase-functions");
const { getFirestore } = require("firebase-admin/firestore");
const { ethers } = require("ethers");
const { POLI_ABI } = require("../utils/abi/POLI_ABI");

const POLI_ADDRESS = process.env.POLI_ADDRESS;
const RPC_URL = process.env.RPC_URL;
const TREASURY_ADDRESS = process.env.TREASURY_ADDRESS;

const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
const poliContract = new ethers.Contract(POLI_ADDRESS, POLI_ABI, provider);

exports.spendPoliFromUser = functions.https.onCall(async (_data, context) => {
  const data = _data?.data || _data;
  const { uid, ethAddress, amount, sessionType } = data;

  if (!ethAddress || !amount || isNaN(amount) || Number(amount) <= 0) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Missing or invalid parameters: ethAddress, amount"
    );
  }

  try {
    const parsedAmount = ethers.utils.parseUnits(amount.toString(), 18);
    const allowance = await poliContract.allowance(ethAddress, TREASURY_ADDRESS);

    if (allowance.lt(parsedAmount)) {
      throw new Error("Insufficient allowance. Please approve POLI token spend first.");
    }

    // Send from user to treasury (user must have approved this contract)
    const signer = provider.getSigner(); // NOTE: Needs MetaMask transaction
    const tx = await poliContract.connect(signer).transferFrom(
      ethAddress,
      TREASURY_ADDRESS,
      parsedAmount
    );

    await tx.wait();

    // Log to Firestore
    const db = getFirestore();
    await db.collection("transactions").add({
      type: "POLI_SPENT",
      from: ethAddress,
      to: TREASURY_ADDRESS,
      amount: Number(amount),
      sessionType: sessionType || "unspecified",
      uid: uid || null,
      txHash: tx.hash,
      timestamp: new Date().toISOString(),
    });

    return { success: true, txHash: tx.hash };
  } catch (error) {
    console.error("❌ POLI spend error:", error);
    throw new functions.https.HttpsError("internal", "Failed to spend POLI", error.message);
  }
});
