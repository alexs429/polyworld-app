const functions = require("firebase-functions");
const cors = require("cors")({ origin: true });
const { ethers } = require("ethers");

// 🔐 These should be in your .env or Firebase config
const USDT_ADDRESS = process.env.USDT_ADDRESS;
const RPC_URL = process.env.RPC_URL;
const { USDT_ABI } = require("../utils/abi/USDT_ABI");

const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
const usdtContract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, provider);

exports.getUsdtBalance = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    try {
      const { address } = req.body;

      if (!address) {
        return res.status(400).json({ error: "Missing address" });
      }

      const balance = await usdtContract.balanceOf(address);
      const formatted = ethers.utils.formatUnits(balance, 6); // USDT uses 6 decimals

      res.status(200).json({ amount: formatted });
    } catch (error) {
      console.error("USDT Balance error:", error);
      res.status(500).json({ error: "Failed to fetch USDT balance" });
    }
  });
});
