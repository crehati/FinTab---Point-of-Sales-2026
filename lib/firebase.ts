
import { initializeApp, getApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

/**
 * FIREBASE CONFIGURATION PROTOCOL
 * Successfully synchronized with user-provided production credentials.
 */
const firebaseConfig = {
  apiKey: "AIzaSyBZ391b-wK2VJWYGi6IFr0z9gcqwpE7DXs",
  authDomain: "fintab-848fc.firebaseapp.com",
  projectId: "fintab-848fc",
  storageBucket: "fintab-848fc.firebasestorage.app",
  messagingSenderId: "83710090293",
  appId: "1:83710090293:web:9a17d3404d4b80e0dc657c",
  measurementId: "G-7X5LZPPW5L"
};

// Check if valid keys have been provided
export const isFirebaseConfigured = 
    firebaseConfig.apiKey && 
    firebaseConfig.apiKey !== "YOUR_API_KEY" && 
    firebaseConfig.projectId !== "YOUR_PROJECT_ID";

let app;
let auth: any;
let db: any;
let storage: any;

if (isFirebaseConfigured) {
    try {
        app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
        auth = getAuth(app);
        db = getFirestore(app);
        storage = getStorage(app);
    } catch (error) {
        console.error("Firebase Initialization Failure:", error);
    }
} else {
    // Falls back to local simulation if keys are missing to prevent runtime crashes
    console.warn("FinTab Terminal: Firebase not configured. Identity simulation engaged.");
    auth = { isSimulator: true };
}

export { auth, db, storage };
export default app;
