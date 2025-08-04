const { ethers } = require("ethers");
const { POLI_ABI } = require("./abi/POLI_ABI");

const POLI_ADDRESS = process.env.POLI_ADDRESS;
const TREASURY_PRIVATE_KEY = process.env.TREASURY_KEY;
const RPC_URL = process.env.RPC_URL;

const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
const treasurySigner = new ethers.Wallet(TREASURY_PRIVATE_KEY, provider);
const poliContract = new ethers.Contract(POLI_ADDRESS, POLI_ABI, treasurySigner);

async function burnPoli(userAddress, amount) {
  const amountInWei = ethers.utils.parseUnits(amount.toString(), 18);

  const tx = await poliContract.burnFromTreasury(userAddress, amountInWei);
  await tx.wait();
  return tx.hash;
}

module.exports = { burnPoli };
