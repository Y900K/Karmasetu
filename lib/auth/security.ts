import { createHash, randomBytes, scryptSync, timingSafeEqual, randomInt } from 'crypto';

const HASH_SEPARATOR = ':';

export function hashSecret(value: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(value, salt, 64).toString('hex');
  return `${salt}${HASH_SEPARATOR}${hash}`;
}

export function verifySecret(value: string, storedHash: string): boolean {
  const [salt, originalHash] = storedHash.split(HASH_SEPARATOR);
  if (!salt || !originalHash) {
    return false;
  }

  const candidateHash = scryptSync(value, salt, 64).toString('hex');
  const originalBuffer = Buffer.from(originalHash, 'hex');
  const candidateBuffer = Buffer.from(candidateHash, 'hex');

  if (originalBuffer.length !== candidateBuffer.length) {
    return false;
  }

  return timingSafeEqual(originalBuffer, candidateBuffer);
}

export function generateOneTimeCode(): string {
  return String(randomInt(100000, 1000000));
}

export function maskEmail(email?: string): string {
  if (!email) return 'none';
  const [local = '', domain = 'unknown'] = email.split('@');
  if (!local) return `***@${domain}`;
  return `${local.slice(0, 1)}***@${domain}`;
}

export function generateSessionToken(): string {
  return randomBytes(32).toString('hex');
}

export function buildTokenFingerprint(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function normalizePhone(phone: string): string | null {
  const digits = phone.replace(/\D/g, '');

  if (digits.length === 10 && /^[6-9]\d{9}$/.test(digits)) {
    return `+91${digits}`;
  }

  if (digits.length === 12 && digits.startsWith('91') && /^[6-9]\d{9}$/.test(digits.slice(2))) {
    return `+${digits}`;
  }

  return null;
}

export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 6) {
    return phone;
  }

  const prefix = digits.slice(0, 2);
  const suffix = digits.slice(-2);
  return `+91 ${prefix}XXXXXX${suffix}`;
}