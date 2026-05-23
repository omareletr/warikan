import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";

const {
  NEXT_PUBLIC_FIREBASE_API_KEY: apiKey,
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: authDomain,
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: projectId,
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: storageBucket,
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: messagingSenderId,
  NEXT_PUBLIC_FIREBASE_APP_ID: appId,
} = process.env;

// Guard against missing env vars at build time (e.g. on CI or Netlify branch
// deploys where Firebase vars may not be set). All consumers check for null.
const isConfigured = Boolean(apiKey && authDomain && projectId && appId);

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;

if (isConfigured) {
  app = getApps().length ? getApps()[0] : initializeApp({
    apiKey,
    authDomain,
    projectId,
    storageBucket,
    messagingSenderId,
    appId,
  });
  auth = getAuth(app);
  db = getFirestore(app);
}

export { auth, db };
