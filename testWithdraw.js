// testWithdraw.js
import { initializeApp } from "firebase/app";
import {
  getFunctions,
  connectFunctionsEmulator,
  httpsCallable
} from "firebase/functions";

// Minimal emulator config
const firebaseConfig = {
  apiKey: "fake-api-key",
  authDomain: "localhost",
  projectId: "polyworld-2f581"
};

// Initialize app and emulator
const app = initializeApp(firebaseConfig);
const functions = getFunctions(app);
connectFunctionsEmulator(functions, "localhost", 5001);

// Call the withdraw function
const withdrawPoli = httpsCallable(functions, "withdrawPoliFromRANDL");

withdrawPoli({
  uid: "testuser1",
  ethAddress: "0xAc635A363a5Ed7DE0795e904D1fE5385d79f4914",
  amount: 1
})
  .then((result) => {
    console.log("✅ Success:", result.data);
  })
  .catch((error) => {
    console.error("❌ Error:", error.message, error.details);
  });
