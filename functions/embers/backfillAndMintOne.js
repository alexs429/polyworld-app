// POST /backfillAndMintOne
// {
//  "emberId": "finance",
//  "mint": true,
//  "dry": true
//}

const functions = require("firebase-functions");
const admin = require("firebase-admin");
const fetch = (...args) => import("node-fetch").then(m => m.default(...args));
const FormData = require("form-data");
const { ethers } = require("ethers");

// ---- Init ----
if (!admin.apps.length) {
  admin.initializeApp({ storageBucket: "polyworld-2f581.appspot.com" });
}
const db = admin.firestore();
const bucket = admin.storage().bucket();
const BUCKET = bucket.name;

// ---- ABI (robust import, handles {EMBER_NFT} or default) ----
let ABI;
try {
  const maybe = require("../utils/abi/EMBER_NFT");
  ABI = Array.isArray(maybe) ? maybe
      : Array.isArray(maybe?.EMBER_NFT) ? maybe.EMBER_NFT
      : Array.isArray(maybe?.default) ? maybe.default
      : undefined;
} catch (e) {
  console.error("ABI require failed:", e);
}
if (!Array.isArray(ABI)) {
  throw new Error("EMBER_NFT ABI not loaded as an array. Check export/path.");
}

// ---- Utils ----
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
async function retry(fn, attempts = 3, baseDelay = 600) {
  let last;
  for (let i = 0; i < attempts; i++) {
    try { return await fn(); }
    catch (e) {
      last = e;
      const msg = String(e?.message || e);
      if (!/5\d\d|ECONN|ETIMEDOUT|ENOTFOUND|network|timeout/i.test(msg)) break;
      await sleep(baseDelay * (i + 1));
    }
  }
  throw last;
}
const get = (o, path) => path.split(".").reduce((a,k)=> (a && a[k]!==undefined ? a[k] : undefined), o);

async function uploadToLighthouse(buf, name, apiKey) {
  const form = new FormData();
  form.append("file", buf, name);
  const res = await fetch("https://node.lighthouse.storage/api/v0/add", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, ...form.getHeaders() },
    body: form,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Lighthouse error ${res.status}: ${text}`);
  const data = JSON.parse(text);
  if (!data?.Hash) throw new Error(`No CID in response: ${text}`);
  return data.Hash;
}
async function downloadBuffer(file) {
  const [buf] = await file.download();
  return buf;
}
async function resolveImageFile(id, data) {
  const fields = [
    "imageGcs","image","imgPath","avatarGcs","avatarPath","avatarUrl",
    "media.avatarUrl","media.bannerUrl","imagePath","photo","photoPath"
  ];
  for (const key of fields) {
    const v = get(data, key);
    if (typeof v === "string" && v.startsWith("gs://")) {
      const u = new URL(v.replace("firebasestorage.app", "appspot.com"));
      const objectPath = u.pathname.replace(/^\/+/, "");
      return bucket.file(objectPath);
    }
  }
  const fallbacks = [`embers/${id}/avatar.png`,`embers/${id}/avatar.jpg`,`embers/${id}/avatar.webp`];
  for (const p of fallbacks) {
    const f = bucket.file(p);
    const [exists] = await f.exists();
    if (exists) return f;
  }
  return null;
}
function buildMetadata(id, data, imageIpfs) {
  const name = data.name || id;
  const description = `${data.focus || "Ember"} trained by ${data.trainer || "Unknown"}`;
  const attributes = [
    { trait_type: "Focus", value: data.focus || "General" },
    { trait_type: "Trainer", value: data.trainer || "Unknown" },
  ];
  if (data.dob) attributes.push({ trait_type: "DOB", value: String(data.dob) });

  const meta = {
    name,
    description,
    image: imageIpfs,                           // ipfs://<imageCid>
    external_url: data.chainUrl || undefined,
    attributes,
    hash: data.hash || undefined,
    dob: data.dob || undefined,
    focus: data.focus || undefined,
    trainer: data.trainer || undefined,
  };
  Object.keys(meta).forEach(k => meta[k] === undefined && delete meta[k]);
  return meta;
}

// ---- Combined handler ----
// POST body:
// { emberId: "finance", mint: true|false, force: false|true, dry: false|true }
exports.backfillAndMintOne = functions.https.onRequest(async (req, res) => {
  try {
    const apiKey = process.env.LIGHTHOUSE_API_KEY;
    if (!apiKey) return res.status(500).json({ ok: false, error: "Missing LIGHTHOUSE_API_KEY" });

    const { emberId, mint = false, force = false, dry = false } = req.body || {};
    if (!emberId) return res.status(400).json({ ok: false, error: "Missing emberId" });

    const ref = db.doc(`embers/${emberId}`);
    const snap = await ref.get();
    if (!snap.exists) return res.status(404).json({ ok: false, error: "Ember not found" });
    const data = snap.data();

    const out = { emberId };

    // ---------- Backfill (image + metadata) ----------
    let { imageCid, imageIpfs, metadataCid, metadataIpfs } = data;

    // Image
    if (force || !imageIpfs || !imageCid) {
      const imgFile = await resolveImageFile(emberId, data);
      if (!imgFile) throw new Error("Could not resolve avatar image in GCS");
      const imgBuf = await downloadBuffer(imgFile);
      imageCid = await retry(() => uploadToLighthouse(imgBuf, `${emberId}-avatar`, apiKey));
      imageIpfs = `ipfs://${imageCid}`;
      await ref.set({
        imageCid, imageIpfs,
        imageGcs: `gs://${BUCKET}/${imgFile.name}`,
        updatedAt: Date.now(),
      }, { merge: true });
      out.imageCid = imageCid;
    }

    // Metadata
    if (force || !metadataIpfs || !metadataCid) {
      const metaObj = buildMetadata(emberId, { ...data, imageIpfs }, imageIpfs);
      const metaBuf = Buffer.from(JSON.stringify(metaObj));
      metadataCid = await retry(() => uploadToLighthouse(metaBuf, `${emberId}-metadata.json`, apiKey));
      metadataIpfs = `ipfs://${metadataCid}`;
      await ref.set({
        metadataCid, metadataIpfs,
        updatedAt: Date.now(),
      }, { merge: true });
      out.metadataCid = metadataCid;
    }

    // If caller only wanted backfill, return here (no mint).
    if (!mint || dry) {
      return res.json({ ok: true, ...out, backfilled: true, minted: false, dry });
    }

    // ---------- Mint ----------
    if (data?.nft?.status === "minted" && !force) {
      return res.json({ ok: true, ...out, alreadyMinted: true, minted: false });
    }

    const to = get(data, "wallet.payoutAddress");
    if (!to) return res.status(400).json({ ok: false, error: "Missing wallet.payoutAddress on Ember" });

    const provider = new ethers.providers.JsonRpcProvider(process.env.RPC_URL);
    const wallet = new ethers.Wallet(process.env.PRIVATE_TREASURY_KEY, provider);
    const contract = new ethers.Contract(process.env.EMBER_NFT_ADDRESS, ABI, wallet);

    const tx = await contract.mint(to, metadataIpfs);
    const receipt = await tx.wait();
    const ev = receipt.events?.find(e => e.event === "Transfer");
    const tokenId = ev?.args?.tokenId?.toString();

    // read back tokenURI (suggested improvement)
    let tokenUri = null;
    try {
      tokenUri = await contract.tokenURI(tokenId);
    } catch (_) {}

    await ref.set({
      nft: {
        status: "minted",
        standard: "ERC-721",
        contract: process.env.EMBER_NFT_ADDRESS,
        tokenId,
        tokenUri: tokenUri || null,
        mintTx: tx.hash,
        owner: to,
        mintedAt: Date.now(),
      },
      updatedAt: Date.now(),
    }, { merge: true });

    return res.json({
      ok: true,
      ...out,
      to,
      tokenId,
      txHash: tx.hash,
      tokenUri: tokenUri || undefined,
      minted: true
    });
  } catch (err) {
    console.error("backfillAndMintOne error:", err);
    return res.status(500).json({ ok: false, error: String(err?.message || err) });
  }
});
