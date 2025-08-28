// functions/embers/backfillOne.js
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const fetch = (...args) => import("node-fetch").then((m) => m.default(...args));
const FormData = require("form-data");
const path = require("path");

if (!admin.apps.length) {
  admin.initializeApp({ storageBucket: "polyworld-2f581.appspot.com" });
}
const db = admin.firestore();
const bucket = admin.storage().bucket();
const BUCKET = bucket.name;

// Utilities (from your existing shared logic)
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function retry(fn, attempts = 3, baseDelayMs = 600) {
  let last;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (e) {
      last = e;
      const msg = String(e?.message || e);
      if (!/5\d\d|ECONN|ETIMEDOUT|ENOTFOUND|network|timeout/i.test(msg)) break;
      await sleep(baseDelayMs * (i + 1));
    }
  }
  throw last;
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

function get(obj, dotted) {
  return dotted
    .split(".")
    .reduce((o, k) => (o && o[k] !== undefined ? o[k] : undefined), obj);
}

async function downloadBuffer(gcsFile) {
  const [buf] = await gcsFile.download();
  return buf;
}

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
  if (!res.ok)
    throw new Error(`Lighthouse upload failed (${res.status}): ${text}`);
  const data = JSON.parse(text);
  if (!data?.Hash) throw new Error(`No CID returned: ${text}`);
  return data.Hash;
}

function buildMetadata(docId, data, imageIpfs) {
  const name = data.name || docId;
  const description = `${data.focus || "Ember"} trained by ${
    data.trainer || "Unknown"
  }`;
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

async function resolveImageGcsPath(id, data) {
  const fieldsToTry = [
    "imageGcs",
    "image",
    "imgPath",
    "avatarGcs",
    "avatarPath",
    "avatarUrl",
    "media.avatarUrl",
    "media.bannerUrl",
    "imagePath",
    "photo",
    "photoPath",
  ];

  for (const key of fieldsToTry) {
    const val = key.includes(".") ? get(data, key) : data[key];
    const norm = normalizeGs(val);
    if (norm?.startsWith("gs://")) {
      const u = new URL(norm);
      const objectPath = u.pathname.replace(/^\/+/, "");
      return bucket.file(objectPath);
    }
  }

  const fallbackPaths = [
    `embers/${id}/avatar.png`,
    `embers/${id}/avatar.jpg`,
    `embers/${id}/avatar.webp`,
  ];
  for (const p of fallbackPaths) {
    const f = bucket.file(p);
    const [exists] = await f.exists();
    if (exists) return f;
  }

  return null;
}

exports.backfillOne = functions.https.onRequest(async (req, res) => {
  try {
    const apiKey = process.env.LIGHTHOUSE_API_KEY;
    if (!apiKey)
      return res
        .status(500)
        .json({ ok: false, error: "Missing LIGHTHOUSE_API_KEY" });

    const { emberId } = req.body || {};
    if (!emberId)
      return res.status(400).json({ ok: false, error: "Missing emberId" });

    const snap = await db.doc(`embers/${emberId}`).get();
    if (!snap.exists)
      return res
        .status(404)
        .json({ ok: false, error: `Ember ${emberId} not found` });
    const data = snap.data();

    if (data.metadataIpfs && data.imageIpfs) {
      return res.json({ ok: true, alreadyExists: true, emberId });
    }

    const file = await resolveImageGcsPath(emberId, data);
    if (!file) throw new Error(`Image not found in GCS for ${emberId}`);

    const imgBuf = await downloadBuffer(file);
    const imageCid = await retry(() =>
      lighthouseUploadBuffer(imgBuf, `${emberId}-avatar.png`, apiKey)
    );
    const imageIpfs = `ipfs://${imageCid}`;

    const meta = buildMetadata(emberId, data, imageIpfs);
    const metaBuf = Buffer.from(JSON.stringify(meta));
    const metadataCid = await retry(() =>
      lighthouseUploadBuffer(metaBuf, `${emberId}-metadata.json`, apiKey)
    );
    const metadataIpfs = `ipfs://${metadataCid}`;

    await snap.ref.set(
      {
        imageIpfs,
        metadataIpfs,
        imageCid,
        metadataCid,
        imageGcs: `gs://${BUCKET}/${file.name}`,
        updatedAt: Date.now(),
      },
      { merge: true }
    );

    return res.json({ ok: true, emberId, imageCid, metadataCid });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ ok: false, error: String(err) });
  }
});
