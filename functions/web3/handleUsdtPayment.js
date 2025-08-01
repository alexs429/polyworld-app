const functions = require("firebase-functions");
const { ethers } = require("ethers");
const { POLI_ABI } = require("../utils/abi/POLI_ABI");
const { transferPoliToUser } = require("./transferPoliToUser");

const { USDT_ABI } = require("../utils/abi/USDT_ABI");
const USDT_ADDRESS = process.env.USDT_ADDRESS;
const POLI_REWARD_AMOUNT = 5;

const RPC_URL = process.env.RPC_URL;
const TREASURY_ADDRESS = process.env.TREASURY_ADDRESS;

const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
const usdtContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, provider);

exports.handleUsdtPayment = functions.https.onCall(async (_data, context) => {
  const data = _data?.data || _data;
  const { ethAddress, uid } = data;

  if (!ethAddress) {
    throw new functions.https.HttpsError("invalid-argument", "Missing ethAddress");
  }

  try {
    // 🔍 Check USDT balance (simple form — assumes user sent to treasury)
    const balance = await usdtContract.balanceOf(TREASURY_ADDRESS);
    const usdtAmount = Number(ethers.utils.formatUnits(balance, 6)); // USDT = 6 decimals

    if (usdtAmount < 10) {
      throw new Error("USDT payment not received or too low.");
    }

    // 🎁 Reward POLI via internal call
    const rewardResult = await transferPoliToUser({
      data: {
        uid,
        ethAddress,
        amount: POLI_REWARD_AMOUNT,
        reason: "usdt-payment",
      }
    }, context);

    return {
      success: true,
      usdtReceived: usdtAmount,
      reward: `${POLI_REWARD_AMOUNT} POLI`,
      txHash: rewardResult?.txHash || null,
    };

  } catch (error) {
    console.error("❌ USDT check error:", error);
    throw new functions.https.HttpsError("internal", "Failed to verify USDT payment", error.message);
  }
});
