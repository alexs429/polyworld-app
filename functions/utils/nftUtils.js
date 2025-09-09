// functions/utils/nftUtils.js
const admin = require("firebase-admin");
const axios = require("axios");
const FormData = require("form-data");
const { ethers } = require("ethers");

// Ensure admin is initialized *once* with the storage bucket.
// This matches your working backfillOne.js pattern.
if (!admin.apps.length) {
  admin.initializeApp({
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET || "polyworld-2f581.appspot.com",
  });
}
const bucket = admin.storage().bucket();
const BUCKET = bucket.name;

// 🔑 Environment variables
const LIGHTHOUSE_API_KEY = process.env.LIGHTHOUSE_API_KEY;
const RPC_URL = process.env.RPC_URL;
const PRIVATE_TREASURY_KEY = process.env.PRIVATE_TREASURY_KEY;
const EMBER_NFT_ADDRESS = process.env.EMBER_NFT_ADDRESS;
// IMPORTANT: this should export an array (the ABI)
const { EMBER_NFT } = require("./abi/EMBER_NFT");

/* ------------------------------- helpers ------------------------------- */

function normalizeGs(p) {
  if (!p) return p;
  return String(p)
    // handle accidental firebasestorage.app -> appspot.com conversions
    .replace("gs://polyworld-2f581.firebasestorage.app/", `gs://${BUCKET}/`)
    .replace("firebasestorage.app", "appspot.com");
}

function get(obj, dotted) {
  return dotted
    .split(".")
    .reduce((o, k) => (o && o[k] !== undefined ? o[k] : undefined), obj);
}

// Find an existing avatar file in GCS, given the ember doc.
async function resolveImageGcsFile(emberId, data) {
  const fieldsToTry = [
    "media.avatarUrl",
    "media.bannerUrl",
    "avatarUrl",
    "imageGcs",
    "imagePath",
    "avatarPath",
    "image",
  ];

  for (const key of fieldsToTry) {
    const val = key.includes(".") ? get(data, key) : data[key];
    if (!val) continue;
    const norm = normalizeGs(val);
    if (norm.startsWith("gs://")) {
      const u = new URL(norm);
      const objectPath = u.pathname.replace(/^\/+/, "");
      return bucket.file(objectPath);
    }
  }

  // Fallback common locations
  const fallbacks = [
    `embers/${emberId}/avatar.png`,
    `embers/${emberId}/avatar.jpg`,
    `embers/${emberId}/avatar.webp`,
  ];
  for (const p of fallbacks) {
    const f = bucket.file(p);
    const [exists] = await f.exists();
    if (exists) return f;
  }
  return null;
}

async function lighthouseUploadBuffer(buf, filename) {
  if (!LIGHTHOUSE_API_KEY) {
    throw new Error("Missing LIGHTHOUSE_API_KEY");
  }
  const form = new FormData();
  form.append("file", buf, filename);

  const res = await axios.post("https://node.lighthouse.storage/api/v0/add", form, {
    headers: { Authorization: `Bearer ${LIGHTHOUSE_API_KEY}`, ...form.getHeaders() },
    maxContentLength: Infinity,
    maxBodyLength: Infinity,
  });

  if (!res?.data?.Hash) {
    throw new Error(`Lighthouse upload failed: ${res && res.data ? JSON.stringify(res.data) : "no data"}`);
  }
  return res.data.Hash; // CID
}

/* ------------------------------ main fns ------------------------------- */

/**
 * Upload avatar + metadata to Lighthouse (using GCS bytes, not public HTTP).
 * Returns { imageCid, metadataCid }.
 */
async function uploadToLighthouse(emberDoc) {
  // 1) Resolve the avatar object in GCS
  const file = await resolveImageGcsFile(emberDoc.id || emberDoc.emberId || "", emberDoc);
  if (!file) {
    throw new Error(`Avatar not found in GCS for ember ${emberDoc.id || emberDoc.emberId}`);
  }
  const [imgBuf] = await file.download();

  // 2) Upload the avatar bytes to Lighthouse
  const imageCid = await lighthouseUploadBuffer(imgBuf, `${emberDoc.id || "ember"}-avatar.png`);

  // 3) Build metadata from the Firestore doc
  const metadata = {
    // prefer identity.name if present, else first/last, else id
    name:
      emberDoc.identity?.name ||
      [emberDoc.identity?.firstName, emberDoc.identity?.lastName].filter(Boolean).join(" ").trim() ||
      emberDoc.name ||
      emberDoc.id ||
      "Unnamed Ember",
    description: emberDoc.persona?.description || "",
    longBio: emberDoc.persona?.longBio || "",
    tagline: emberDoc.persona?.tagline || "",
    tone: emberDoc.persona?.tone || "",
    image: `ipfs://${imageCid}`,
    trainer: emberDoc.createdBy || emberDoc.trainer || "",
    createdAt: emberDoc.createdAt || new Date().toISOString(),
  };

  // 4) Upload metadata.json to Lighthouse
  const metaBuf = Buffer.from(JSON.stringify(metadata));
  const metadataCid = await lighthouseUploadBuffer(metaBuf, `${emberDoc.id || "ember"}-metadata.json`);

  return { imageCid, metadataCid };
}

/**
 * Mint Ember NFT on-chain
 * Returns { tokenId, txHash }.
 */
async function mintNFT(wallet, metadataCid) {
  const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
  const signer = new ethers.Wallet(PRIVATE_TREASURY_KEY, provider);
  const contract = new ethers.Contract(EMBER_NFT_ADDRESS, EMBER_NFT, signer);

  // Your contract uses "mint" (not "safeMint")
  const tx = await contract.mint(wallet, `ipfs://${metadataCid}`);
  const receipt = await tx.wait();

  // Extract tokenId from Transfer event (matches your working code)
  const transferEvent = receipt.events?.find((e) => e.event === "Transfer");
  const tokenId = transferEvent?.args?.tokenId?.toString();

  return { tokenId, txHash: receipt.transactionHash };
}

module.exports = {
  uploadToLighthouse,
  mintNFT,
};
