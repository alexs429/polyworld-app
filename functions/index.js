// Central export for Polyworld Firebase Cloud Functions
const functions = require('firebase-functions');

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

// 💬 Sessions (chat + teaching)
exports.createSession = require('./sessions/createSession').createSession;
exports.getAllSessionsByUser = require('./sessions/getAllSessionsByUser').getAllSessionsByUser;
exports.getSessionById = require('./sessions/getSessionById').getSessionById;
exports.summarizeSession = require('./sessions/summarizeSession').summarizeSession;

// 🧪 Seeder
exports.seedAll = require('./seed/seedAll').seedAll;

// Metamask
exports.authenticateMetamask = require('./metamask/authenticateMetamask').authenticateMetamask;

// 🚧 Future Express API grouping (optional)
// exports.api = require('./api');
