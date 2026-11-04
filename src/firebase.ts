import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyA1tEbNiKA8yC6CRX_KokykanugbEC6y_g",
  authDomain: "ainsutra.firebaseapp.com",
  projectId: "ainsutra",
  storageBucket: "ainsutra.firebasestorage.app",
  messagingSenderId: "351631612218",
  appId: "1:351631612218:web:9d147c12773dbd5ba05803",
  measurementId: "G-2CCQTF0QK4",
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
