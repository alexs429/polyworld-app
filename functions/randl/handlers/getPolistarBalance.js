// GEN1 HTTP function
const functions = require("firebase-functions"); // 👈 ensure v1
const admin = require("firebase-admin");
const cors = require("cors")({ origin: true }); // 👈 define CORS

// safe one-time init
if (!admin.apps.length) admin.initializeApp();
const db = admin.firestore();
const auth = admin.auth();

exports.getPolistarBalance = functions.https // 👈 match your deployed region
  .onRequest((req, res) => {
    // CORS preflight + wrapper (harmless even same-origin)
    cors(req, res, async () => {
      try {
        console.log('In getPolistarBalance', req.method);
        if (req.method !== "POST") {
          return res.status(405).send("Method Not Allowed");
        }
        // ---- Authentication: verify Firebase ID token ----
        const authHeader = req.get("Authorization") || "";
        const m = authHeader.match(/^Bearer\s+(.+)$/i);
        if (!m) {
          return res.status(401).json({ error: "auth/missing-token" });
        }
        const idToken = m[1];
        console.log(
          "🔐 token.len:",
          idToken.length,
          " funcProject:",
          process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT
        );
        let decoded;
        try {
          decoded = await auth.verifyIdToken(idToken); // <-- no 'true' (revocation) while debugging
          console.log(
            "✅ token ok aud:",
            decoded.aud,
            " proj:",
            decoded.firebase?.project_id,
            " uid:",
            decoded.uid
          );
        } catch (e) {
          console.error("verifyIdToken failed:", e);
          return res.status(401).json({ error: "auth/invalid-token" });
        }
        // optional: decoded.uid is available here if you ever want to enforce ownership
        //if (decoded.uid.toLowerCase() !== uid.toLowerCase()) {
        //  return res.status(403).json({ error: "auth/uid-mismatch" });
        //}

        const { uid } = req.body || {};
        if (!uid) return res.status(400).json({ error: "Missing uid" });

        const ref = db.doc(`users/${uid}/tokens/POLISTAR`);
        const snap = await ref.get();

        if (!snap.exists) {
          return res.status(200).json({
            balance: 0,
            withdrawable: 0,
            symbolic: false,
            swappable: false,
            updatedAt: null,
          });
        }

        const data = snap.data();
        return res.status(200).json({
          balance: Number(data.balance ?? 0),
          withdrawable: Number(
            data.withdrawable ?? data.withdrawableBalance ?? 0
          ),
          symbolic: Boolean(data.symbolic),
          swappable: Boolean(data.swappable),
          updatedAt: data.updatedAt ?? null,
        });
      } catch (err) {
        console.error("❌ getPolistarBalance failed:", err?.stack || err);
        return res
          .status(500)
          .json({ error: "internal", message: String(err?.message || err) });
      }
    });
  });
