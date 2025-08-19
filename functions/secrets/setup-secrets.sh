# Firebase secrets for Polyworld Backend
# When onboarding a new environment (e.g. a staging project), just run:
#./setup-secrets.sh
# …and it will prompt for each secret interactively


# 🔐 Treasury private key (no 0x prefix)
firebase functions:secrets:set PRIVATE_TREASURY_KEY

# 🌐 Sepolia RPC URL (e.g. Alchemy endpoint)
firebase functions:secrets:set RPC_URL

# 📬 On-chain POLI token contract address
firebase functions:secrets:set POLI_ADDRESS

firebase functions:secrets:set DFX_PROJECT_ID
firebase functions:secrets:set DFX_AGENT_ID
firebase functions:secrets:set DFX_LOCATION