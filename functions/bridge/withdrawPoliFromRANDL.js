const functions = require("firebase-functions");
const { getFirestore } = require("firebase-admin/firestore");
const { ethers } = require("ethers");
const { POLI_ABI } = require("../utils/abi/POLI_ABI");
const { getTokenMetadata } = require("../utils/getTokenMetadata");

exports.withdrawPoliFromRANDL = functions.https.onCall(async (_data, context) => {
  const data = _data?.data || _data;
  const { uid, ethAddress, amount } = data;

  console.log("DEBUG 🔍 Received", uid, ethAddress, amount);

  if (!uid || !ethAddress || !amount || isNaN(amount) || Number(amount) <= 0) {
    throw new functions.https.HttpsError("invalid-argument", "Missing or invalid parameters: uid, ethAddress, amount");
  }

  const db = getFirestore();
  const tokenId = "POLISTAR";
  const metadata = await getTokenMetadata(tokenId);

  if (!metadata?.withdrawable) {
    throw new functions.https.HttpsError("permission-denied", "POLISTAR is not withdrawable.");
  }

  const userDocs = await db.collection("balances")
    .where("userId", "==", uid)
    .where("tokenId", "==", tokenId)
    .limit(1)
    .get();

  if (userDocs.empty) {
    throw new functions.https.HttpsError("not-found", "Balance document not found.");
  }

  const userRef = userDocs.docs[0].ref;
  const userData = userDocs.docs[0].data();
  const current = userData.withdrawableBalance || 0;

  if (Number(current) < Number(amount)) {
    throw new functions.https.HttpsError("failed-precondition", "Insufficient POLISTAR balance.");
  }

  const amountInWei = ethers.utils.parseUnits(amount.toString(), 18);

  await db.runTransaction(async (t) => {
    t.update(userRef, {
      withdrawableBalance: Number(current) - Number(amount),
      updatedAt: Date.now()
    });
  });

  // On-chain mint
  const POLI_ADDRESS = process.env.POLI_ADDRESS;
  const PRIVATE_KEY = process.env.PRIVATE_TREASURY_KEY;
  const provider = new ethers.providers.JsonRpcProvider(process.env.RPC_URL);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  const poliContract = new ethers.Contract(POLI_ADDRESS, POLI_ABI, wallet);

  try {
    console.log("🔐 Minting on-chain with", {
      POLI_ADDRESS,
      ethAddress,
      amountInWei: amountInWei.toString()
    });

    const tx = await poliContract.mint(ethAddress, amountInWei);
    console.log("⛓️ Mint TX submitted:", tx.hash);

    await tx.wait();
    console.log("✅ Mint confirmed:", tx.hash);

    return {
      status: "success",
      message: `Minted ${amount} POLI to ${ethAddress}`,
      txHash: tx.hash
    };
  } catch (error) {
    console.error("❌ Minting failed:", error);
    throw new functions.https.HttpsError("internal", "Failed to mint POLI on-chain.");
  }

});
