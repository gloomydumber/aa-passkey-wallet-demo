/**
 * WebAuthn module exports
 */

export {
  buildRegistrationOptions,
  startRegistration,
  registerPasskey,
} from "./registration";

export {
  buildAuthenticationOptions,
  startAuthentication,
  authenticatePasskey,
  isWebAuthnSupported,
  isPlatformAuthenticatorAvailable,
} from "./authentication";

export {
  isUserCancellation,
  isCredentialExistsError,
} from "./helpers";
