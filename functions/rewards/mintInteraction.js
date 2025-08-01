const admin = require("firebase-admin");
const { getSystemConfig } = require("../utils/config");

async function maybeMintInteractionReward(address, type = "1min") {
  if (!address) throw new Error("Missing wallet address");

  const validTypes = ["1min", "3min"];
  if (!validTypes.includes(type)) {
    throw new Error(`Invalid reward type: ${type}`);
  }

  const config = await getSystemConfig();
  const rewardAmount = config[`polistar${type}Reward`] || 10;
  const delaySec = config.rewardDelays?.[`reward${type}DelaySec`] || 60;

  const travellerRef = admin.firestore().doc(`travellers/${address}`);
  const balanceRef = admin.firestore().doc(`polistarBalances/${address}`);

  const [travellerSnap, balanceSnap] = await Promise.all([
    travellerRef.get(),
    balanceRef.get()
  ]);

  const earned = travellerSnap.exists ? travellerSnap.data().polistarEarnedTimestamps || {} : {};

  if (earned[type]) {
    console.log(`✅ ${type} reward already granted to ${address}`);
    return { minted: false, reason: "already rewarded" };
  }

  // Optional: delay the mint (simulate delay if not handled client-side)
  await new Promise(resolve => setTimeout(resolve, delaySec * 1000));

  // Mint tokens to POLISTAR balance (simulate or use your existing logic)
  const current = Number(balanceSnap.exists ? balanceSnap.data().amount : 0);
  const newAmount = current + rewardAmount;

  await balanceRef.set(
    {
      amount: newAmount,
      swappable: false,
      withdrawable: false,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    },
    { merge: true }
  );

  // Update timestamp flag
  await travellerRef.set(
    {
      polistarEarnedTimestamps: {
        [type]: true
      }
    },
    { merge: true }
  );

  console.log(`🎉 Minted ${rewardAmount} POLISTAR (${type}) to ${address}`);
  return { minted: true, amount: rewardAmount, type };
}

module.exports = {
  maybeMintInteractionReward
};
