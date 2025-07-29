const functions = require('firebase-functions');
const ethers = require('ethers');
const { POLI_ABI } = require('./abi/POLI_ABI');

// POLI contract address on Sepolia
const POLI_ADDRESS = process.env.POLI_ADDRESS;



const mintPoli = async (toAddress, amount) => {
  try {
    const treasuryKey = process.env.TREASURY_KEY;
    const rpcUrl = process.env.RPC_URL;

    if (!treasuryKey || !rpcUrl) {
      throw new Error('Missing treasury_key or rpc_url in Firebase config');
    }

    // Convert to 18 decimals (if passed as whole number POLISTAR)
    const amountInWei = ethers.utils.parseUnits(amount.toString(), 18);

    // Connect to Sepolia
    const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
    const wallet = new ethers.Wallet(treasuryKey, provider);
    const poliContract = new ethers.Contract(POLI_ADDRESS, POLI_ABI, wallet);

    // Send mint transaction
    const tx = await poliContract.mint(toAddress, amountInWei);
    await tx.wait();

    console.log("✅ POLI minted on Sepolia:", tx.hash);
    return tx.hash;

  } catch (error) {
    console.error("❌ Failed to mint POLI:", error);
    throw error;
  }
};

module.exports = { mintPoli };