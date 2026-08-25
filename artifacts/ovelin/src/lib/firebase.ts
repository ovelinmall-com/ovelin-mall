import { initializeApp, getApps, getApp } from "firebase/app";
import { getMessaging, getToken, onMessage, type Messaging } from "firebase/messaging";

const firebaseConfig = {
  apiKey: "AIzaSyCjeZbaraXNeKyeW73KBFLWDX3YRLgPZqc",
  authDomain: "ovelin-7a26d.firebaseapp.com",
  projectId: "ovelin-7a26d",
  storageBucket: "ovelin-7a26d.firebasestorage.app",
  messagingSenderId: "786618250840",
  appId: "1:786618250840:web:5a7529bb53f22230b3bc2d",
};

export const FCM_VAPID_KEY = "o2oU5aHLJql0ZqO-kHlRybEh051vifnwn-68gJpybac";

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

let _messaging: Messaging | null = null;

export function getFirebaseMessaging(): Messaging | null {
  if (typeof window === "undefined") return null;
  if (_messaging) return _messaging;
  try {
    _messaging = getMessaging(app);
    return _messaging;
  } catch {
    return null;
  }
}

export { getToken, onMessage };
