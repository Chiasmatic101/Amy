import { getVercelOidcToken } from "@vercel/oidc";
import {
  IdentityPoolClient,
  SubjectTokenSupplier,
} from "google-auth-library";

const GOOGLE_PROJECT_NUMBER = "275021325588";
const WORKLOAD_IDENTITY_POOL = "amy-vercel";
const WORKLOAD_IDENTITY_PROVIDER = "vercel-amy";

const SERVICE_ACCOUNT_EMAIL =
  process.env.AMY_FIRESTORE_CONNECTOR_SERVICE_ACCOUNT_EMAIL;

class VercelSubjectTokenSupplier implements SubjectTokenSupplier {
  async getSubjectToken(): Promise<string> {
    const token = await getVercelOidcToken();

    if (!token) {
      throw new Error(
        "Unable to obtain Vercel OIDC token. This authentication flow must run on Vercel."
      );
    }

    return token;
  }
}

export function getAmyGoogleAuthClient() {
  if (!SERVICE_ACCOUNT_EMAIL) {
    throw new Error(
      "Missing AMY_FIRESTORE_CONNECTOR_SERVICE_ACCOUNT_EMAIL environment variable."
    );
  }

  const audience =
    `//iam.googleapis.com/projects/${GOOGLE_PROJECT_NUMBER}` +
    `/locations/global/workloadIdentityPools/${WORKLOAD_IDENTITY_POOL}` +
    `/providers/${WORKLOAD_IDENTITY_PROVIDER}`;

  const serviceAccountImpersonationUrl =
    `https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/` +
    `${encodeURIComponent(SERVICE_ACCOUNT_EMAIL)}:generateAccessToken`;

  return new IdentityPoolClient({
    audience,
    subjectTokenType: "urn:ietf:params:oauth:token-type:jwt",
    tokenUrl: "https://sts.googleapis.com/v1/token",
    serviceAccountImpersonationUrl,
    subjectTokenSupplier: new VercelSubjectTokenSupplier(),
  });
}