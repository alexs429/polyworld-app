// functions/web3/buyPoliFromUsdt.js
const functions = require("firebase-functions");
const cors = require("cors")({ origin: true });
const { ethers } = require("ethers");
const { POLISWAP_ABI } = require("../utils/abi/POLISWAP_ABI");

const RPC_URL = process.env.RPC_URL;
const POLISWAP_ADDRESS = process.env.POLISWAP_ADDRESS;

exports.buyPoliFromUsdt = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    try {
      const { usdtAmount, travellerAddress } = req.body;
      console.log("POLISWAP_ADDRESS:", POLISWAP_ADDRESS);
      console.log("RPC_URL:", RPC_URL);

      if (!usdtAmount || !travellerAddress) {
        console.error("Missing parameters:", req.body);
        return res.status(400).json({ error: "Missing parameters" });
      }
      const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
      const contract = new ethers.Contract(POLISWAP_ADDRESS, POLISWAP_ABI, provider);

      const iface = new ethers.utils.Interface(POLISWAP_ABI);
      const data = iface.encodeFunctionData("buyPoli", [usdtAmount]);

      return res.json({
        to: POLISWAP_ADDRESS,
        data,
        value: "0x0"
      });
    } catch (err) {
      console.error("💥 buyPoliFromUsdt failed:", err);
      return res.status(500).json({ error: "Internal error" });
    }
  });
});
