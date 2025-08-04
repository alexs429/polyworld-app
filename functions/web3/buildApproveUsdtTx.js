const functions = require("firebase-functions");
const cors = require("cors")({ origin: true });
const { ethers } = require("ethers");
const { USDT_ABI } = require("../utils/abi/USDT_ABI");

const USDT_ADDRESS = process.env.USDT_ADDRESS;
const POLISWAP_ADDRESS = process.env.POLISWAP_ADDRESS;

exports.buildApproveUsdtTx = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    try {
      const { travellerAddress, amount } = req.body;

      if (!travellerAddress || !amount) {
        return res.status(400).json({ error: "Missing parameters" });
      }
      console.log("POLISWAP_ADDRESS: ", POLISWAP_ADDRESS);
      const iface = new ethers.utils.Interface(USDT_ABI);
      const data = iface.encodeFunctionData("approve", [
        POLISWAP_ADDRESS,
        amount,
      ]);

      return res.json({
        to: USDT_ADDRESS,
        from: travellerAddress,
        data,
        value: "0x0",
      });
    } catch (err) {
      console.error("❌ buildApproveUsdtTx failed:", err);
      return res.status(500).json({ error: "Internal error" });
    }
  });
});
