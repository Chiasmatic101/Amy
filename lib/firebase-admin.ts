import { cert, getApps, initializeApp, ServiceAccount } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import serviceAccountJson from "../secrets/firebase-admin.json";

const serviceAccount = serviceAccountJson as ServiceAccount;

const adminApp =
  getApps().length === 0
    ? initializeApp({
        credential: cert(serviceAccount),
      })
    : getApps()[0];

export const adminDb = getFirestore(adminApp);

export default adminApp;