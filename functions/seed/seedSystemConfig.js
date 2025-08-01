const functions = require("firebase-functions");
const admin = require("firebase-admin");

exports.seedSystemConfig = functions.https.onRequest(async (req, res) => {
  try {
    const configRef = admin.firestore().doc("system/config");
    await configRef.set({
      polistarWelcomeReward: 5,
      polistar1minReward: 10,
      polistar3minReward: 10,
      emberThresholdPolistars: 10,
      emberSessionCost: 10,
      flameRequirementPolistars: 100,
      flameTrainingCost: 50,
      flameTrainingDurationMins: 30,
      sessionGracePeriodSecs: 10,
      rewardDelays: {
        welcomeDelaySec: 10,
        reward1minDelaySec: 60,
        reward3minDelaySec: 180
      }
    }, { merge: true });

    res.status(200).send("✅ system/config seeded successfully");
  } catch (err) {
    console.error("❌ Failed to seed config:", err);
    res.status(500).send("Error");
  }
});