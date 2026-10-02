import {
  FirestoreValue,
  RawFirestoreDocument,
} from "./firestore-mapper";

export type FirestoreConsentResult = {
  eligible: boolean;
  researchConsent: boolean;
  ageVerified: boolean;
  reason:
    | "eligible"
    | "research-consent-required"
    | "age-verification-required"
    | "research-consent-and-age-verification-required";
};

function getBoolean(
  value?: FirestoreValue
): boolean {
  return value?.booleanValue === true;
}

export function evaluateFirestoreConsent(
  document: RawFirestoreDocument
): FirestoreConsentResult {
  const fields =
    document.fields ?? {};

  const consent =
    fields.consent?.mapValue?.fields ?? {};

  const researchConsent =
    getBoolean(consent.research);

  const ageVerified =
    getBoolean(consent.ageVerified);

  if (
    researchConsent &&
    ageVerified
  ) {
    return {
      eligible: true,
      researchConsent: true,
      ageVerified: true,
      reason: "eligible",
    };
  }

  if (
    !researchConsent &&
    !ageVerified
  ) {
    return {
      eligible: false,
      researchConsent: false,
      ageVerified: false,
      reason:
        "research-consent-and-age-verification-required",
    };
  }

  if (!researchConsent) {
    return {
      eligible: false,
      researchConsent: false,
      ageVerified,
      reason:
        "research-consent-required",
    };
  }

  return {
    eligible: false,
    researchConsent,
    ageVerified: false,
    reason:
      "age-verification-required",
  };
}