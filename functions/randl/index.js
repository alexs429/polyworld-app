// RANDL Cloud Function Exports

console.log("✅ RANDL index.js loaded");

exports.createToken = require('./handlers/createToken').createToken;
exports.mintToken = require('./handlers/mintToken').mintToken;
exports.transferToken = require('./handlers/transferToken').transferToken;
exports.burnToken = require('./handlers/burnToken').burnToken;
exports.bridgeToken = require('./handlers/bridgeToken').bridgeToken;

// Future handlers can be added here:
// exports.mintToken = require('./handlers/mintToken').mintToken;
// exports.transferToken = require('./handlers/transferToken').transferToken;
// exports.bridgeToken = require('./handlers/bridgeToken').bridgeToken;