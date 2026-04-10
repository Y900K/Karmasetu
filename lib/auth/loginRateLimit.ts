type AttemptRecord = {
  attempts: number;
  firstAttemptAt: number;
  blockedUntil?: number;
};

const MAX_ATTEMPTS = 3;
const WINDOW_MS = 60 * 60 * 1000; // 60 minutes rolling window for attempts gathering
const BLOCK_MS = 30 * 60 * 1000; // 30 minutes block penalty

const attemptsStore = new Map<string, AttemptRecord>();

function now() {
  return Date.now();
}

function getRecord(key: string): AttemptRecord {
  const existing = attemptsStore.get(key);
  if (!existing) {
    const created = { attempts: 0, firstAttemptAt: now() };
    attemptsStore.set(key, created);
    return created;
  }

  return existing;
}

function resetIfWindowExpired(record: AttemptRecord) {
  if (now() - record.firstAttemptAt > WINDOW_MS) {
    record.attempts = 0;
    record.firstAttemptAt = now();
    record.blockedUntil = undefined;
  }
}

export function checkLoginRateLimit(key: string): { blocked: boolean; retryAfterSec?: number } {
  const record = getRecord(key);
  resetIfWindowExpired(record);

  if (record.blockedUntil && record.blockedUntil > now()) {
    return {
      blocked: true,
      retryAfterSec: Math.max(1, Math.ceil((record.blockedUntil - now()) / 1000)),
    };
  }

  if (record.blockedUntil && record.blockedUntil <= now()) {
    record.blockedUntil = undefined;
    record.attempts = 0;
    record.firstAttemptAt = now();
  }

  return { blocked: false };
}

export function recordFailedLogin(key: string): { blocked: boolean; retryAfterSec?: number } {
  const record = getRecord(key);
  resetIfWindowExpired(record);

  record.attempts += 1;
  if (record.attempts >= MAX_ATTEMPTS) {
    record.blockedUntil = now() + BLOCK_MS;
    return {
      blocked: true,
      retryAfterSec: Math.ceil(BLOCK_MS / 1000),
    };
  }

  return { blocked: false };
}

export function clearLoginAttempts(key: string) {
  attemptsStore.delete(key);
}
