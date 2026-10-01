import {
  App,
  getApps,
  initializeApp,
} from "firebase-admin/app";

import {
  Firestore,
  getFirestore,
} from "firebase-admin/firestore";

import {
  getAmyGoogleAuthClient,
} from "./vercel-google-auth";

const externalFirestoreInstances = new Map<
  string,
  Firestore
>();

async function getExternalAccessToken(): Promise<string> {
  const authClient = getAmyGoogleAuthClient();

  const accessToken = await authClient.getAccessToken();

  if (!accessToken.token) {
    throw new Error(
      "Google Workload Identity Federation did not return an access token."
    );
  }

  return accessToken.token;
}

export async function getExternalFirestore(
  projectId: string
): Promise<Firestore> {
  const existingFirestore =
    externalFirestoreInstances.get(projectId);

  if (existingFirestore) {
    return existingFirestore;
  }

  const accessToken = await getExternalAccessToken();

  const appName = `external-${projectId}`;

  let app: App;

  const existingApp = getApps().find(
    (candidate) => candidate.name === appName
  );

  if (existingApp) {
    app = existingApp;
  } else {
    app = initializeApp(
      {
        projectId,
        credential: {
          getAccessToken: async () => {
            const authClient =
              getAmyGoogleAuthClient();

            const token =
              await authClient.getAccessToken();

            if (!token.token) {
              throw new Error(
                "Unable to obtain Google access token."
              );
            }

            return {
              access_token: token.token,
              expires_in: 3600,
            };
          },
        },
      },
      appName
    );
  }

  const firestore = getFirestore(app);

  externalFirestoreInstances.set(
    projectId,
    firestore
  );

  // Force authentication now rather than waiting
  // until the first Firestore query.
  if (!accessToken) {
    throw new Error(
      "Unable to authenticate external Firestore connection."
    );
  }

  return firestore;
}