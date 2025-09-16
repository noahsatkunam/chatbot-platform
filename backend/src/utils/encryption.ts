import crypto from 'crypto';

const DEFAULT_ALGORITHM = 'aes-256-gcm';
const DEFAULT_VERSION = 1;
const IV_LENGTH = 12;
const KEY_LENGTH = 32;

export interface SerializedEncryptedData {
  version: number;
  algorithm: string;
  iv: string;
  ciphertext: string;
  authTag?: string;
}

export interface DecryptOptions {
  legacyBase64?: boolean;
}

let cachedKey: Buffer | null = null;

function resolveKey(): Buffer {
  if (cachedKey) {
    return cachedKey;
  }

  const rawKey =
    process.env.ENCRYPTION_KEY ||
    process.env.APP_ENCRYPTION_KEY ||
    process.env.SECRET_KEY ||
    'default-key-change-in-production';

  const trimmedKey = rawKey.trim();

  if (looksLikeBase64(trimmedKey)) {
    try {
      const decoded = Buffer.from(trimmedKey, 'base64');
      if (decoded.length === KEY_LENGTH) {
        cachedKey = decoded;
        return cachedKey;
      }
    } catch {
      // Fallback to hashing below
    }
  }

  let keyBuffer = Buffer.from(trimmedKey, 'utf8');
  if (keyBuffer.length !== KEY_LENGTH) {
    keyBuffer = crypto.createHash('sha256').update(trimmedKey).digest();
  }

  cachedKey = keyBuffer;
  return cachedKey;
}

function normalizePayload(payload: any): SerializedEncryptedData | null {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const iv = typeof payload.iv === 'string' ? payload.iv : undefined;
  const ciphertextCandidate =
    typeof payload.ciphertext === 'string'
      ? payload.ciphertext
      : typeof payload.content === 'string'
        ? payload.content
        : typeof payload.data === 'string'
          ? payload.data
          : undefined;

  if (!iv || !ciphertextCandidate) {
    return null;
  }

  const algorithm =
    typeof payload.algorithm === 'string' ? payload.algorithm : DEFAULT_ALGORITHM;
  const authTag =
    typeof payload.authTag === 'string'
      ? payload.authTag
      : typeof payload.tag === 'string'
        ? payload.tag
        : undefined;
  const version =
    typeof payload.version === 'number' ? payload.version : DEFAULT_VERSION;

  return {
    version,
    algorithm,
    iv,
    ciphertext: ciphertextCandidate,
    authTag
  };
}

function parseEncrypted(value: string): SerializedEncryptedData | null {
  try {
    const parsed = JSON.parse(value);
    return normalizePayload(parsed);
  } catch {
    return null;
  }
}

function looksLikeBase64(value: string): boolean {
  if (!value || value.length % 4 !== 0) {
    return false;
  }

  return /^[A-Za-z0-9+/]+={0,2}$/.test(value);
}

export function encryptString(value: string): SerializedEncryptedData {
  if (typeof value !== 'string') {
    throw new TypeError('Value to encrypt must be a string');
  }

  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(DEFAULT_ALGORITHM, resolveKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return {
    version: DEFAULT_VERSION,
    algorithm: DEFAULT_ALGORITHM,
    iv: iv.toString('base64'),
    ciphertext: encrypted.toString('base64'),
    authTag: authTag.toString('base64')
  };
}

export function encryptToString(value: string): string {
  return JSON.stringify(encryptString(value));
}

export function encryptOptionalString(value?: string | null): string | null {
  if (value === undefined || value === null) {
    return null;
  }

  return encryptToString(value);
}

export function decryptString(payload: SerializedEncryptedData): string {
  try {
    const iv = Buffer.from(payload.iv, 'base64');
    const ciphertext = Buffer.from(payload.ciphertext, 'base64');
    const decipher = crypto.createDecipheriv(payload.algorithm || DEFAULT_ALGORITHM, resolveKey(), iv);

    if (payload.authTag && payload.algorithm.includes('gcm')) {
      decipher.setAuthTag(Buffer.from(payload.authTag, 'base64'));
    }

    const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    return decrypted.toString('utf8');
  } catch (error) {
    throw new Error('Failed to decrypt value');
  }
}

export function decryptFromString(value: string, options: DecryptOptions = {}): string {
  if (!value) {
    return '';
  }

  const parsed = parseEncrypted(value);
  if (parsed) {
    return decryptString(parsed);
  }

  if (options.legacyBase64 && looksLikeBase64(value)) {
    try {
      return Buffer.from(value, 'base64').toString('utf8');
    } catch (error) {
      throw new Error('Failed to decode legacy encrypted value');
    }
  }

  return value;
}

export function decryptOptionalString(value?: string | null, options: DecryptOptions = {}): string | null {
  if (value === undefined || value === null) {
    return null;
  }

  return decryptFromString(value, options);
}

export function isEncryptedString(value?: string | null): boolean {
  if (!value) {
    return false;
  }

  return parseEncrypted(value) !== null;
}
