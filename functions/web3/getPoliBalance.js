const functions = require("firebase-functions");
const cors = require("cors")({ origin: true });
const { ethers } = require("ethers");
const { POLI_ABI } = require("../utils/abi/POLI_ABI");

const POLI_ADDRESS = process.env.POLI_ADDRESS;
const RPC_URL = process.env.RPC_URL;

const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
const contract = new ethers.Contract(POLI_ADDRESS, POLI_ABI, provider);

exports.getPoliBalance = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    const { address } = req.body;
    if (!address) {
      return res.status(400).json({ error: "Missing address" });
    }

    try {
      const rawBalance = await contract.balanceOf(address);
      const amount = ethers.utils.formatUnits(rawBalance, 18);
      res.status(200).json({ amount });
    } catch (error) {
      console.error("Balance error:", error);
      res.status(500).json({ error: "Failed to get balance" });
    }
  });
});
