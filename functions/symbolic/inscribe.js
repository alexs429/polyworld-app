const functions = require("firebase-functions");
const { logSymbolicEvent } = require("../utils/logSymbolicEvent");

exports.inscribeSymbolicEvent = functions.https.onCall(async (data, context) => {
    const inscribe = httpsCallable(functions, "inscribeSymbolicEvent");

    await inscribe({
    uid: "traveller_XYZ",
    token: "TRUST_LOOP",
    action: "completed-ritual",
    metadata: {
        partner: "traveller_ABC",
        stage: "3 of 7",
        notes: "Ritual complete under moonlight"
    }
    });

});