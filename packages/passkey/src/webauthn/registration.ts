/**
 * WebAuthn registration implementation
 */

import {
  startRegistration as simpleWebAuthnStartRegistration,
  type PublicKeyCredentialCreationOptionsJSON,
} from "@simplewebauthn/browser";
import { PasskeyError } from "@aa-wallet/utils";
import { uint8ArrayToBase64, base64UrlToUint8Array } from "@aa-wallet/utils";
import type {
  PasskeyCredential,
  PasskeyRegistrationOptions,
  RegistrationResponse,
  UserInfo,
  PasskeyConfig,
} from "../types";
import { generateChallenge, generateUserId } from "../storage/crypto";
import { isUserCancellation, isCredentialExistsError, parseCOSEPublicKey } from "./helpers";

/**
 * Build registration options for WebAuthn
 */
export function buildRegistrationOptions(
  user: UserInfo,
  config: PasskeyConfig
): PasskeyRegistrationOptions {
  return {
    rp: {
      name: config.rpName,
      id: config.rpId,
    },
    user: {
      id: user.id,
      name: user.name,
      displayName: user.displayName,
    },
    challenge: generateChallenge(),
    pubKeyCredParams: [
      { type: "public-key", alg: -7 }, // ES256
      { type: "public-key", alg: -257 }, // RS256
    ],
    timeout: config.timeout ?? 60000,
    authenticatorSelection: {
      authenticatorAttachment: config.authenticatorAttachment,
      residentKey: config.residentKey ?? "preferred",
      userVerification: config.userVerification ?? "required",
    },
    attestation: "none",
  };
}

/**
 * Convert PasskeyRegistrationOptions to SimpleWebAuthn format
 */
function toSimpleWebAuthnOptions(
  options: PasskeyRegistrationOptions,
  existingCredentialIds: string[] = []
): PublicKeyCredentialCreationOptionsJSON {
  return {
    rp: options.rp,
    user: {
      id: options.user.id,
      name: options.user.name,
      displayName: options.user.displayName,
    },
    challenge: options.challenge,
    pubKeyCredParams: options.pubKeyCredParams,
    timeout: options.timeout,
    authenticatorSelection: options.authenticatorSelection,
    attestation: options.attestation,
    excludeCredentials: existingCredentialIds.map((id) => ({
      type: "public-key" as const,
      id,
    })),
  };
}

/**
 * Start WebAuthn registration ceremony
 */
export async function startRegistration(
  options: PasskeyRegistrationOptions,
  existingCredentialIds: string[] = []
): Promise<RegistrationResponse> {
  try {
    const simpleOptions = toSimpleWebAuthnOptions(options, existingCredentialIds);
    const response = await simpleWebAuthnStartRegistration({ optionsJSON: simpleOptions });

    // Parse the attestation object to extract public key
    const attestationObject = base64UrlToUint8Array(response.response.attestationObject);
    const clientDataJSON = response.response.clientDataJSON;

    // Decode authenticator data from attestation object
    // The attestation object is CBOR encoded
    const authData = parseAuthenticatorData(attestationObject);

    const { publicKey, algorithm, aaguid } = parseCOSEPublicKey(authData);

    const credential: PasskeyCredential = {
      id: response.id,
      rawId: response.rawId,
      publicKey: uint8ArrayToBase64(publicKey),
      algorithm,
      createdAt: Date.now(),
      aaguid,
    };

    return {
      credential,
      attestationObject: response.response.attestationObject,
      clientDataJSON,
    };
  } catch (error) {
    if (isUserCancellation(error)) {
      throw new PasskeyError("Registration cancelled by user", { cause: error });
    }
    if (isCredentialExistsError(error)) {
      throw new PasskeyError("A passkey already exists for this device", { cause: error });
    }
    throw new PasskeyError(
      error instanceof Error ? error.message : "Registration failed",
      { cause: error }
    );
  }
}

/**
 * Parse authenticator data from CBOR-encoded attestation object
 * This is a simplified parser that handles the common case
 */
function parseAuthenticatorData(attestationObject: Uint8Array): Uint8Array {
  // Attestation object is CBOR encoded with structure:
  // { fmt: string, attStmt: {...}, authData: bytes }
  //
  // We need to find the authData field. In CBOR, this will be prefixed
  // with the text string "authData" (68 61 75 74 68 44 61 74 61)

  const authDataKey = new Uint8Array([0x68, 0x61, 0x75, 0x74, 0x68, 0x44, 0x61, 0x74, 0x61]);

  let authDataStart = -1;
  for (let i = 0; i < attestationObject.length - authDataKey.length; i++) {
    let match = true;
    for (let j = 0; j < authDataKey.length; j++) {
      if (attestationObject[i + j] !== authDataKey[j]) {
        match = false;
        break;
      }
    }
    if (match) {
      authDataStart = i + authDataKey.length;
      break;
    }
  }

  if (authDataStart === -1) {
    throw new PasskeyError("Could not find authData in attestation object");
  }

  // The next byte(s) indicate the length of the byte string
  // CBOR byte string: 0x40-0x57 = 0-23 bytes, 0x58 = 1 byte length, 0x59 = 2 byte length
  const lengthByte = attestationObject[authDataStart]!;
  let authDataLength: number;
  let dataStart: number;

  if (lengthByte >= 0x40 && lengthByte <= 0x57) {
    authDataLength = lengthByte - 0x40;
    dataStart = authDataStart + 1;
  } else if (lengthByte === 0x58) {
    authDataLength = attestationObject[authDataStart + 1]!;
    dataStart = authDataStart + 2;
  } else if (lengthByte === 0x59) {
    authDataLength = (attestationObject[authDataStart + 1]! << 8) | attestationObject[authDataStart + 2]!;
    dataStart = authDataStart + 3;
  } else {
    throw new PasskeyError("Invalid CBOR byte string length encoding");
  }

  return attestationObject.slice(dataStart, dataStart + authDataLength);
}

/**
 * Register a new passkey with simple user info
 */
export async function registerPasskey(
  userName: string,
  config: PasskeyConfig,
  existingCredentialIds: string[] = []
): Promise<RegistrationResponse> {
  const user: UserInfo = {
    id: generateUserId(),
    name: userName,
    displayName: userName,
  };

  const options = buildRegistrationOptions(user, config);
  return startRegistration(options, existingCredentialIds);
}
