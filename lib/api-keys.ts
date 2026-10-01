import crypto from "crypto";

/**
 * Creates a new AMY client API key.
 *
 * Example:
 * amy_test_a83f2c...
 */
export function generateApiKey(environment: "test" | "live" = "test") {
  const secret = crypto.randomBytes(32).toString("hex");

  return `amy_${environment}_${secret}`;
}

/**
 * Hashes an API key before storing it.
 *
 * We never store the usable API key itself in Firestore.
 */
export function hashApiKey(apiKey: string) {
  return crypto
    .createHash("sha256")
    .update(apiKey)
    .digest("hex");
}

/**
 * Returns a short identifier that is safe to display
 * in the AMY dashboard.
 */
export function getApiKeyPrefix(apiKey: string) {
  return apiKey.substring(0, 18);
}