import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth, initializeAuth } from "firebase/auth";
// @ts-ignore - এই ফাংশনটা firebase/auth এর React Native ভার্সনে আছে
import { getReactNativePersistence } from "firebase/auth";
import { getFirestore, initializeFirestore } from "firebase/firestore";
import { Platform } from "react-native";

// ⚠️ পুরনো firebase.ts থেকে তোমার নিজের config এখানে বসাও (apiKey, projectId ... সব)
const firebaseConfig = {
  apiKey: "AIzaSyA1tEbNiKA8yC6CRX_KokykanugbEC6y_g",
  authDomain: "ainsutra.firebaseapp.com",
  projectId: "ainsutra",
  storageBucket: "ainsutra.appspot.com",
  messagingSenderId: "351631612218",
  appId: "1:351631612218:web:9d147c12773dbd5ba05803",
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// AsyncStorage এর v2 ও v3 দুই ভার্সনেই কাজ করে
function getStorage(): any {
  try {
    const mod: any = require("@react-native-async-storage/async-storage");
    if (typeof mod.createAsyncStorage === "function")
      return mod.createAsyncStorage("app");
    return mod.default ?? mod;
  } catch {
    return null;
  }
}

// Session: লগইন ফোনে সংরক্ষিত থাকে, অ্যাপ বন্ধ করে খুললেও logout হয় না
function makeAuth() {
  if (Platform.OS === "web") return getAuth(app);
  try {
    const storage = getStorage();
    if (!storage) {
      console.warn("AUTH: AsyncStorage not found, session will NOT persist");
      return getAuth(app);
    }
    Promise.resolve(storage.setItem("ping", "1")).catch((e: any) =>
      console.warn("AUTH: storage test failed", e),
    );
    return initializeAuth(app, {
      persistence: getReactNativePersistence(storage),
    });
  } catch (e) {
    console.warn("AUTH: persistence setup failed", e);
    return getAuth(app);
  }
}
export const auth = makeAuth();

// Firestore (real-time database)
function makeDb() {
  try {
    return initializeFirestore(app, { experimentalForceLongPolling: true });
  } catch {
    return getFirestore(app);
  }
}
export const db = makeDb();
