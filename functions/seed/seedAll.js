// Central export for Polyworld Firebase Cloud Functions
const functions = require('firebase-functions');
const { db } = require('../utils/firebase');

// 🧪 Seeder
const handler = functions.https.onRequest(async (_req, res) => {
  const travellerRef = db.collection('travellers').doc('0xT123');
  await travellerRef.set({
    walletAddress: '0xT123',
    userName: 'TestTraveller',
    isGuest: false,
    tokenBalance: 10,
    subscriptionType: 'monthly'
  });

  const flameRef = db.collection('flames').doc('0xF456');
  await flameRef.set({
    walletAddress: '0xF456',
    userName: 'TestFlame',
    bio: 'A wise Flame guiding embers',
    tokenBalance: 100
  });

  await db.collection('embers').add({
    flameId: '0xF456',
    name: 'Ember Beta',
    personality: {
      tone: 'playful',
      specialty: 'storytelling',
      voiceStyle: 'mystical'
    },
    nftMetadataUrl: 'https://example.com/nfts/ember-beta.json',
    createdAt: Date.now(),
    isPublic: true,
    summaryCount: 5,
    status: 'active'
  });

    async function seedPolistarToken() {
    const tokenRef = db.collection("tokens").doc("POLISTAR");

    await tokenRef.set({
      name: "Polyworld Internal Token",
      symbol: "POLISTAR",
      totalSupply: 980000000,
      creator: "0xPolyworldTreasury",
      swappable: true,
      withdrawable: true,
      symbolic: false,
      bridge_to: ["POLI", "USDT", "ETH"],
      mintAuthority: ["0xPolyworldTreasury"]
    });

    console.log("✅ POLISTAR token seeded.");
  
    
  }

  seedPolistarToken().catch(console.error);


  res.status(200).send('Seed data created');
});

module.exports = {
  seedAll: handler // 👈 Export it with a clean name
};