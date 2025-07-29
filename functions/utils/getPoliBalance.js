const functions = require("firebase-functions");
const ethers = require("ethers");
const cors = require("cors")({ origin: true });
const { POLI_ABI } = require("./abi/POLI_ABI");

exports.getPoliBalance = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    try {
      const { address } = req.body;

      if (!address) {
        return res.status(400).json({ error: "Missing address" });
      }

      // ⬇️ Moved config access inside the function
      const POLI_ADDRESS = process.env.POLI_ADDRESS;
      const RPC_URL = process.env.RPC_URL;

      const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
      const poliContract = new ethers.Contract(POLI_ADDRESS, POLI_ABI, provider);

      const balance = await poliContract.balanceOf(address);
      const formatted = ethers.utils.formatUnits(balance, 18);

      res.status(200).json({ amount: formatted });
    } catch (error) {
      console.error("Error fetching POLI balance:", error);
      res.status(500).json({ error: "Failed to fetch POLI balance" });
    }
  });
});
