const functions = require("firebase-functions");
const admin = require("firebase-admin");
const { ethers } = require("ethers");
const { EMBER_NFT } = require("../utils/abi/EMBER_NFT");

if (!admin.apps.length) {
  admin.initializeApp();
}
const db = admin.firestore();

exports.mintOne = functions.https.onRequest(async (req, res) => {
  try {
    const { emberId } = req.body || {};
    if (!emberId) {
      return res.status(400).json({ ok: false, error: "Missing emberId" });
    }

    const ref = db.doc(`embers/${emberId}`);
    const snap = await ref.get();
    if (!snap.exists) {
      return res
        .status(404)
        .json({ ok: false, error: `No such Ember: ${emberId}` });
    }

    const data = snap.data();

    // 🔍 Auto-lookup wallet address
    const to = data?.wallet?.payoutAddress;
    if (!to) {
      return res
        .status(400)
        .json({
          ok: false,
          error: `No wallet.payoutAddress found for ${emberId}`,
        });
    }

    if (data?.nft?.status === "minted") {
      return res.json({
        ok: true,
        alreadyMinted: true,
        tokenId: data.nft.tokenId,
      });
    }

    const tokenURI = data?.metadataIpfs;
    if (!tokenURI) {
      return res
        .status(400)
        .json({ ok: false, error: "Missing metadataIpfs for Ember" });
    }
    console.log("ABI type:", typeof EMBER_NFT, Array.isArray(EMBER_NFT));
     if (!EMBER_NFT) {
      return res
        .status(400)
        .json({ ok: false, error: "Missing EMBER ABI" });
    }
    const provider = new ethers.providers.JsonRpcProvider(process.env.RPC_URL);
    const wallet = new ethers.Wallet(
      process.env.PRIVATE_TREASURY_KEY,
      provider
    );
    const contract = new ethers.Contract(
      process.env.EMBER_NFT_ADDRESS,
      EMBER_NFT,
      wallet
    );
    const tx = await contract.mint(to, tokenURI);
    const receipt = await tx.wait();

    const transferEvent = receipt.events?.find((e) => e.event === "Transfer");
    const tokenId = transferEvent?.args?.tokenId?.toString();

    await ref.set(
      {
        nft: {
          status: "minted",
          contract: process.env.EMBER_NFT_ADDRESS,
          tokenId,
          mintTx: tx.hash,
          owner: to,
          mintedAt: Date.now(),
        },
      },
      { merge: true }
    );

    return res.json({ ok: true, emberId, to, tokenId, txHash: tx.hash });
  } catch (err) {
    console.error("Mint error:", err);
    return res.status(500).json({ ok: false, error: String(err) });
  }
});
