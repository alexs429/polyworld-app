const { ethers } = require("ethers");
const { POLI_ABI } = require("./abi/POLI_ABI");
const functions = require("firebase-functions");

const POLI_ADDRESS = process.env.POLI_ADDRESS;
const RPC_URL = process.env.RPC_URL;
const PRIVATE_KEY = process.env.PRIVATE_TREASURY_KEY;

const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
const contract = new ethers.Contract(POLI_ADDRESS, POLI_ABI, wallet);

exports.transferFromUser = async function (userAddress, amount) {
  const amtWei = ethers.utils.parseUnits(amount.toString(), 18);
  const tx = await contract.transferFrom(userAddress, wallet.address, amtWei);
  await tx.wait();
  return tx.hash;
};
