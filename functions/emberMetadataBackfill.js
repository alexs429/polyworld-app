// functions/emberMetadataBackfill.js
// Backfills Ember NFT metadata using Lighthouse IPFS (HTTP API), with queuing + retries.

const functions = require("firebase-functions"); // Gen1-friendly import
const admin = require("firebase-admin");
const fetch = (...args) => import("node-fetch").then(m => m.default(...args));    //const fetch = require("node-fetch");
const FormData = require("form-data");
const path = require("node:path");

// ---------- Firebase Admin (singleton) ----------
if (!admin.apps.length) {
  admin.initializeApp({ storageBucket: "polyworld-2f581.appspot.com" });
}
const db = admin.firestore();
const bucket = admin.storage().bucket();
const BUCKET = bucket.name;

// ---------- Small utils ----------
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function retry(fn, attempts = 3, baseDelayMs = 600) {
  let last;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (e) {
      last = e;
      const msg = String(e?.message || e);
      // Retry only on likely-transient errors
      if (!/5\d\d|ECONN|ETIMEDOUT|ENOTFOUND|network|timeout/i.test(msg)) break;
      await sleep(baseDelayMs * (i + 1)); // simple backoff
    }
  }
  throw last;
}

function get(obj, dotted) {
  return dotted.split(".").reduce((o, k) => (o && o[k] !== undefined ? o[k] : undefined), obj);
}

function normalizeGs(p) {
  if (!p) return p;
  return String(p)
    .replace("gs://polyworld-2f581.firebasestorage.app/", `gs://${BUCKET}/`)
    .replace("firebasestorage.app", "appspot.com");
}

function mimeFromExt(filename) {
  const f = (filename || "").toLowerCase();
  if (f.endsWith(".png")) return "image/png";
  if (f.endsWith(".jpg") || f.endsWith(".jpeg")) return "image/jpeg";
  if (f.endsWith(".webp")) return "image/webp";
  return "application/octet-stream";
}

async function downloadBuffer(gcsFile) {
  const [buf] = await gcsFile.download();
  return buf;
}

// ---------- Lighthouse HTTP upload ----------
async function lighthouseUploadBuffer(buf, fileName, apiKey) {
  const form = new FormData();
  form.append("file", buf, fileName);

  const res = await fetch("https://node.lighthouse.storage/api/v0/add", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      ...form.getHeaders(),
    },
    body: form,
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Lighthouse upload failed (${res.status}): ${text}`);
  }

  let data;
  try { data = JSON.parse(text); }
  catch { throw new Error(`Unexpected Lighthouse response: ${text}`); }

  if (!data?.Hash) throw new Error(`No CID in Lighthouse response: ${text}`);
  return data.Hash; // CID string
}

// ---------- Image path resolution ----------
const FIELDS_TO_TRY = [
  "imageGcs", "image", "imgPath",
  "avatarGcs", "avatarPath", "avatarUrl",
  "media.avatarUrl",               // from your screenshot
  "media.bannerUrl",
  "imagePath", "photo", "photoPath",
];

function resolveImageRefFromField(val) {
  if (!val) return null;
  const field = normalizeGs(val);

  // gs://bucket/object
  if (field.startsWith("gs://")) {
    const u = new URL(field);
    const objectPath = u.pathname.replace(/^\/+/, "");
    return { file: bucket.file(objectPath), name: path.basename(objectPath), objectPath };
  }

  // public https Firebase URL -> extract object path
  if (/firebasestorage\.(googleapis|appspot)\.com/.test(field)) {
    try {
      const url = new URL(field.replace("firebasestorage.app", "appspot.com"));
      const oParam = url.pathname.includes("/o/")
        ? decodeURIComponent(url.pathname.split("/o/")[1] || "")
        : "";
      const objectPath = oParam || decodeURIComponent(url.searchParams.get("name") || "");
      if (!objectPath) return null;
      return { file: bucket.file(objectPath), name: path.basename(objectPath), objectPath };
    } catch {
      return null;
    }
  }

  // bare relative path like "embers/travel/avatar.png"
  return { file: bucket.file(field), name: path.basename(field), objectPath: field };
}

async function findImageForDoc(id, data) {
  // 1) known fields (including nested)
  for (const key of FIELDS_TO_TRY) {
    const val = key.includes(".") ? get(data, key) : data[key];
    const resolved = resolveImageRefFromField(val);
    if (resolved) return resolved;
  }

  // 2) fallback by docId
  const candidates = [
    `embers/${id}/avatar.png`,
    `embers/${id}/avatar.jpg`,
    `embers/${id}/avatar.jpeg`,
    `embers/${id}/avatar.webp`,
  ];
  if (/^psych/.test(id)) {
    const alt = id === "psychologist" ? "psych" : "psychologist";
    candidates.push(
      `embers/${alt}/avatar.png`,
      `embers/${alt}/avatar.jpg`,
      `embers/${alt}/avatar.jpeg`,
      `embers/${alt}/avatar.webp`,
    );
  }

  for (const p of candidates) {
    const f = bucket.file(p);
    const [exists] = await f.exists();
    if (exists) return { file: f, name: path.basename(p), objectPath: p };
  }

  return null;
}

// ---------- Metadata builder ----------
function buildMetadata(docId, data, imageIpfs) {
  const name = data.name || docId;
  const description = `${data.focus || "Ember"} trained by ${data.trainer || "Unknown"}`;
  const attributes = [
    { trait_type: "Focus", value: data.focus || "General" },
    { trait_type: "Trainer", value: data.trainer || "Unknown" },
  ];
  if (data.dob) attributes.push({ trait_type: "DOB", value: String(data.dob) });

  const meta = {
    name,
    description,
    image: imageIpfs,
    external_url: data.chainUrl || undefined,
    attributes,
    hash: data.hash || undefined,
    dob: data.dob || undefined,
    focus: data.focus || undefined,
    trainer: data.trainer || undefined,
  };
  Object.keys(meta).forEach((k) => meta[k] === undefined && delete meta[k]);
  return meta;
}

// ---------- HTTPS function (sequential, queued, retrying) ----------
exports.backfillEmberMetadataFromFirestore = functions.https.onRequest(async (req, res) => {
  try {
    const apiKey = process.env.LIGHTHOUSE_API_KEY;
    console.log("[LH] key present:", !!apiKey, "prefix:", apiKey?.slice(0, 6));
    if (!apiKey || apiKey.length < 10) {
      return res.status(500).json({ ok: false, error: "LIGHTHOUSE_API_KEY not available/invalid" });
    }

    const force = req.query.force === "true";
    const limit = Math.min(Number(req.query.limit || 50), 200); // keep small for Gen1 timeouts
    const paceMs = Math.min(Number(req.query.paceMs || 400), 5000); // delay between docs
    console.log("[backfill] start", { force, limit, paceMs });

    const snap = await db.collection("embers").limit(limit).get();
    if (snap.empty) return res.json({ ok: true, processed: 0, results: [] });

    const results = [];
    for (const doc of snap.docs) {
      const id = doc.id;
      const data = doc.data() || {};
      console.log(`➡️  processing ${id}`);

      if (!force && data.metadataIpfs) {
        results.push({ id, skipped: true, reason: "metadataIpfs exists" });
        continue;
      }

      const resolved = await findImageForDoc(id, data);
      if (!resolved) {
        results.push({ id, error: "Cannot resolve image (checked known fields and fallbacks)", fieldsSeen: Object.keys(data) });
        continue;
      }

      try {
        // Ensure object exists before download
        const [exists] = await resolved.file.exists();
        if (!exists) throw new Error(`GCS object missing: ${resolved.objectPath}`);

        // 1) download from GCS
        const imgBuf = await downloadBuffer(resolved.file);
        console.log(`[LH] ${id} avatar bytes:`, imgBuf.length);

        // 2) upload image to Lighthouse (with retry)
        const imageCid = await retry(
          () => lighthouseUploadBuffer(imgBuf, `${id}-${resolved.name}`, apiKey)
        );
        const imageIpfs = `ipfs://${imageCid}`;

        // 3) build & upload metadata JSON (with retry)
        const metaObj = buildMetadata(id, data, imageIpfs);
        const metaBuf = Buffer.from(JSON.stringify(metaObj));
        const metadataCid = await retry(
          () => lighthouseUploadBuffer(metaBuf, `${id}-metadata.json`, apiKey)
        );
        const metadataIpfs = `ipfs://${metadataCid}`;

        // 4) write back to Firestore
        await doc.ref.set({
          imageIpfs,
          metadataIpfs,
          imageCid,
          metadataCid,
          imageGcs: `gs://${BUCKET}/${resolved.objectPath}`,
          updatedAt: Date.now(),
        }, { merge: true });

        console.log(`✅ ${id} done → metaCid=${metadataCid}`);
        results.push({ id, imageCid, metadataCid });

        // pace between docs to keep memory/timeout stable
        await sleep(paceMs);
      } catch (e) {
        console.error(`❌ ${id} failed`, e);
        results.push({ id, error: String(e?.message || e) });
      }
    }

    return res.json({ ok: true, processed: results.length, results });
  } catch (e) {
    console.error("Handler failed", e);
    return res.status(500).json({ ok: false, error: String(e?.message || e) });
  }
});
