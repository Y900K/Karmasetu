type RequestAttemptRecord = {
  attempts: number;
  firstAttemptAt: number;
  blockedUntil?: number;
};

const requestAttemptsStore = new Map<string, RequestAttemptRecord>();
let lastPruneTime = Date.now();
const PRUNE_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
const MAX_MAP_SIZE = 5000;

function pruneRequestStore() {
  const nowMs = Date.now();
  for (const [key, record] of requestAttemptsStore.entries()) {
    if (nowMs - record.firstAttemptAt > 5 * 60 * 1000 && (!record.blockedUntil || record.blockedUntil <= nowMs)) {
      requestAttemptsStore.delete(key);
    }
  }

  if (requestAttemptsStore.size > MAX_MAP_SIZE) {
    const keys = Array.from(requestAttemptsStore.keys());
    const toDeleteCount = requestAttemptsStore.size - MAX_MAP_SIZE;
    for (let i = 0; i < toDeleteCount; i++) {
      requestAttemptsStore.delete(keys[i]);
    }
  }

  lastPruneTime = nowMs;
}

function currentTimeMs() {
  return Date.now();
}

function getAttemptRecord(key: string): RequestAttemptRecord {
  const nowMs = currentTimeMs();
  if (nowMs - lastPruneTime > PRUNE_INTERVAL_MS || requestAttemptsStore.size > MAX_MAP_SIZE) {
    pruneRequestStore();
  }

  const existing = requestAttemptsStore.get(key);
  if (existing) {
    return existing;
  }

  const created: RequestAttemptRecord = {
    attempts: 0,
    firstAttemptAt: nowMs,
  };
  requestAttemptsStore.set(key, created);
  return created;
}

function resetAttemptWindowIfExpired(record: RequestAttemptRecord, windowMs: number) {
  if (currentTimeMs() - record.firstAttemptAt > windowMs) {
    record.attempts = 0;
    record.firstAttemptAt = currentTimeMs();
    record.blockedUntil = undefined;
  }
}

export function checkRequestRateLimit(
  key: string,
  options?: { maxAttempts?: number; windowMs?: number; blockMs?: number }
): { blocked: boolean; retryAfterSec?: number } {
  const maxAttempts = options?.maxAttempts ?? 10;
  const windowMs = options?.windowMs ?? 60_000;
  const blockMs = options?.blockMs ?? 5 * 60_000;

  const record = getAttemptRecord(key);
  resetAttemptWindowIfExpired(record, windowMs);

  if (record.blockedUntil && record.blockedUntil > currentTimeMs()) {
    return {
      blocked: true,
      retryAfterSec: Math.max(1, Math.ceil((record.blockedUntil - currentTimeMs()) / 1000)),
    };
  }

  if (record.blockedUntil && record.blockedUntil <= currentTimeMs()) {
    record.blockedUntil = undefined;
    record.attempts = 0;
    record.firstAttemptAt = currentTimeMs();
  }

  record.attempts += 1;

  if (record.attempts > maxAttempts) {
    record.blockedUntil = currentTimeMs() + blockMs;
    return {
      blocked: true,
      retryAfterSec: Math.ceil(blockMs / 1000),
    };
  }

  return { blocked: false };
}

export function clearRequestRateLimit(key: string) {
  requestAttemptsStore.delete(key);
}
