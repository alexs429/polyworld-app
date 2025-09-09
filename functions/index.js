// Central export for Polyworld Firebase Cloud Functions
require('dotenv').config(); // ✅ Only place this here for local dev
const functions = require("firebase-functions");


// ✅ Root health check
exports.root = functions.https.onRequest((req, res) => {
  res.send({
    message: "🔥 Polyworld Functions are alive.",
    timestamp: new Date().toISOString()
  });
});

// 🧭 Travellers (users)
exports.createTraveller = require('./travellers/createTraveller')?.createTraveller;
exports.deleteTraveller = require('./travellers/deleteTraveller').deleteTraveller;
exports.getAllTravellers = require('./travellers/getAllTravellers').getAllTravellers;
exports.getTravellerById = require('./travellers/getTravellerById').getTravellerById;
exports.updateTraveller = require('./travellers/updateTraveller').updateTraveller;

// 🔥 Flames (creators)
exports.createFlame = require('./flames/createFlame').createFlame;
exports.deleteFlame = require('./flames/deleteFlame').deleteFlame;
exports.getAllFlames = require('./flames/getAllFlames').getAllFlames;
exports.getFlameById = require('./flames/getFlameById').getFlameById;
exports.updateFlame = require('./flames/updateFlame').updateFlame;

// 🔮 Embers (AI agents)
exports.createEmber = require('./embers/createEmber').createEmber;
exports.deleteEmber = require('./embers/deleteEmber').deleteEmber;
exports.getAllEmbers = require('./embers/getAllEmbers').getAllEmbers;
exports.getEmberById = require('./embers/getEmberById').getEmberById;
exports.updateEmber = require('./embers/updateEmber').updateEmber;
exports.backfillOne = require('./embers/backfillOne').backfillOne;
exports.mintOne = require('./embers/mintOne').mintOne;
exports.backfillAndMintOne = require('./embers/backfillAndMintOne').backfillAndMintOne;
exports.createEmberAgent = require('./embers/createEmberAgent').createEmberAgent;
exports.uploadAvatar = require("./embers/uploadAvatar").uploadAvatar;
exports.updateEmberVoice = require("./embers/updateEmberVoice").updateEmberVoice;
exports.updateEmberIdentity = require("./embers/updateEmberIdentity").updateEmberIdentity;
exports.updateEmberWallet = require("./embers/updateEmberWallet").updateEmberWallet;
exports.updateEmberPersona = require("./embers/updateEmberPersona").updateEmberPersona;
exports.uploadEmberDescription = require("./embers/uploadEmberDescription").uploadEmberDescription;
exports.mintEmberNFT = require("./embers/mintEmberNFT").mintEmberNFT;
exports.finalizeEmberTraining = require("./embers/finalizeEmberTraining").finalizeEmberTraining;

// 💬 Sessions (chat + teaching)
exports.createSession = require('./sessions/createSession').createSession;
exports.getAllSessionsByUser = require('./sessions/getAllSessionsByUser').getAllSessionsByUser;
exports.getSessionById = require('./sessions/getSessionById').getSessionById;
exports.summarizeSession = require('./sessions/summarizeSession').summarizeSession;

// WEB3 functions
exports.transferPoliToUser = require('./web3/transferPoliToUser').transferPoliToUser;
exports.spendPoliFromUser = require('./web3/spendPoliFromUser').spendPoliFromUser;
exports.handleUsdtPayment = require('./web3/handleUsdtPayment').handleUsdtPayment;
exports.getPoliBalance = require('./web3/getPoliBalance').getPoliBalance;
exports.getUsdtBalance = require('./web3/getUsdtBalance').getUsdtBalance;
exports.buyPoliFromUsdt = require('./web3/buyPoliFromUsdt').buyPoliFromUsdt;
exports.buildApproveUsdtTx = require('./web3/buildApproveUsdtTx').buildApproveUsdtTx;
exports.getPoliRate = require('./web3/getPoliRate').getPoliRate;


// 🔁 RANDL Protocol Exports
exports.createToken = require('./randl/handlers/createToken').createToken;
exports.mintToken = require('./randl/handlers/mintToken').mintToken;
exports.transferToken = require('./randl/handlers/transferToken').transferToken;
exports.burnToken = require('./randl/handlers/burnToken').burnToken;
exports.rewardPolistar = require('./randl/handlers/rewardPolistar').rewardPolistar;
exports.spendPolistar = require('./randl/handlers/spendPolistar').spendPolistar;
exports.getPolistarBalance = require('./randl/handlers/getPolistarBalance').getPolistarBalance;
exports.getTokenList = require('./randl/handlers/getTokenList').getTokenList;
exports.transferPolistar = require('./randl/handlers/transferPolistar').transferPolistar;

// CHAT HANDLER
exports.chatHandler = require('./handlers/chatHandler').chatHandler;
exports.ttsEmber = require("./handlers/tts").ttsEmber;

// BRIDGE
exports.bridgeToken = require('./bridge/bridgeToken').bridgeToken;
exports.withdrawPoliFromRANDL = require("./bridge/withdrawPoliFromRANDL").withdrawPoliFromRANDL;


// COMMUNICATION
const { handleTravellerMessage } = require("./conversation/handleTravellerMessage");
exports.handleTravellerMessage = handleTravellerMessage;

// 🧪 Seeder
exports.seedAll = require('./seed/seedAll').seedAll;
exports.seedSystemConfig = require('./seed/seedSystemConfig').seedSystemConfig;
exports.seedAllEmbers = require("./src/admin/seedAllEmbers").seedAllEmbers;

// MERGE
exports.mergeUserSessions = require("./merge/mergeUserSessions").mergeUserSessions;

// Metamask
exports.authenticateMetamask = require('./metamask/authenticateMetamask').authenticateMetamask;


// Symbolic
exports.inscribeSymbolicEvent = require("./symbolic/inscribe").inscribeSymbolicEvent;
exports.onSymbolicEventCreate = require("./symbolic/onSymbolicEventCreate").onSymbolicEventCreate;

// Authentication
exports.createDeviceLoginToken = require("./device/createDeviceLoginToken.js").createDeviceLoginToken;
exports.verifyDeviceLoginToken = require("./device/verifyDeviceLoginToken.js").verifyDeviceLoginToken;

exports.backfillEmberMetadataFromFirestore =
  require("./emberMetadataBackfill").backfillEmberMetadataFromFirestore;


// 🚧 Future Express API grouping (optional)
// exports.api = require('./api');
