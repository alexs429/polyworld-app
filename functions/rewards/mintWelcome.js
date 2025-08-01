const admin = require("firebase-admin");
const { getSystemConfig } = require("../utils/config");

async function maybeMintWelcomeReward(address) {
  if (!address) throw new Error("Missing wallet address");

  const config = await getSystemConfig();
  const welcomeAmount = config.polistarWelcomeReward || 5;
  const delayMs = (config.rewardDelays?.welcomeDelaySec || 10) * 1000;

  const travellerRef = admin.firestore().doc(`travellers/${address}`);
  const travellerSnap = await travellerRef.get();

  // Assume that balance is stored in polistarBalances/{address}
  const balanceRef = admin.firestore().doc(`polistarBalances/${address}`);
  const balanceSnap = await balanceRef.get();
  const currentAmount = Number(balanceSnap.exists ? balanceSnap.data().amount : 0);

  if (currentAmount > 0) {
    console.log("🚫 Traveller already has POLISTARs. No reward needed.");
    return { minted: false, reason: "already has polistars" };
  }

  // Optional: check if already rewarded (idempotency)
  if (travellerSnap.exists && travellerSnap.data()?.polistarEarnedTimestamps?.welcome) {
    console.log("✅ Welcome reward already granted earlier.");
    return { minted: false, reason: "already rewarded" };
  }

  // Wait the configured delay
  await new Promise(resolve => setTimeout(resolve, delayMs));

  // Mint to balance (simulate or real logic)
  await balanceRef.set(
    {
      amount: welcomeAmount,
      swappable: false,
      withdrawable: false,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    },
    { merge: true }
  );

  // Mark that reward has been granted
  await travellerRef.set(
    {
      polistarEarnedTimestamps: {
        welcome: true
      }
    },
    { merge: true }
  );

  console.log(`🎁 Minted ${welcomeAmount} POLISTAR to ${address}`);
  return { minted: true, amount: welcomeAmount };
}

module.exports = {
  maybeMintWelcomeReward
};
