import { Firestore } from "@google-cloud/firestore";

import {
  getAmyGoogleAuthClient,
} from "./vercel-google-auth";

const externalFirestoreInstances = new Map<
  string,
  Firestore
>();

export async function getExternalFirestore(
  projectId: string
): Promise<Firestore> {
  const existing =
    externalFirestoreInstances.get(projectId);

  if (existing) {
    return existing;
  }

  const authClient = getAmyGoogleAuthClient();

  // Force authentication here so WIF / impersonation
  // failures occur before the first Firestore query.
  const accessToken =
    await authClient.getAccessToken();

  if (!accessToken.token) {
    throw new Error(
      "Google Workload Identity Federation did not return an access token."
    );
  }

  const firestore = new Firestore({
    projectId,

    auth: authClient,
  });

  externalFirestoreInstances.set(
    projectId,
    firestore
  );

  return firestore;
}