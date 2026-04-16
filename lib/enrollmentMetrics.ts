type EnrollmentLike = Record<string, unknown> & {
  courseId?: string | { toString: () => string };
  progressPct?: number;
  completedModuleIds?: unknown[];
  viewedDocIds?: unknown[];
  status?: string;
  score?: number;
  studyTimeMs?: number;
  assignedAt?: unknown;
  updatedAt?: unknown;
  completedAt?: unknown;
};

const STATUS_PRIORITY: Record<string, number> = {
  expired: 0,
  assigned: 1,
  in_progress: 2,
  completed: 3,
};

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((entry): entry is string => typeof entry === 'string' && entry.trim().length > 0);
}

function normalizeProgressPct(value: unknown): number {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return 0;
  }

  return Math.max(0, Math.min(100, Math.round(value)));
}

function normalizeScore(value: unknown): number | null {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return null;
  }

  return Math.max(0, Math.min(100, Math.round(value)));
}

function normalizeStudyTimeMs(value: unknown): number {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return 0;
  }

  return Math.max(0, Math.round(value));
}

function toDateOrNull(value: unknown): Date | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value;
  }

  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  return null;
}

function getStatusPriority(value: unknown): number {
  if (typeof value !== 'string') {
    return 0;
  }

  return STATUS_PRIORITY[value] ?? 0;
}

function compareCanonicalCandidate(a: EnrollmentLike, b: EnrollmentLike): number {
  const progressDiff = normalizeProgressPct(a.progressPct) - normalizeProgressPct(b.progressPct);
  if (progressDiff !== 0) {
    return progressDiff;
  }

  const statusDiff = getStatusPriority(a.status) - getStatusPriority(b.status);
  if (statusDiff !== 0) {
    return statusDiff;
  }

  const completedDiff =
    normalizeStringArray(a.completedModuleIds).length - normalizeStringArray(b.completedModuleIds).length;
  if (completedDiff !== 0) {
    return completedDiff;
  }

  const scoreA = normalizeScore(a.score);
  const scoreB = normalizeScore(b.score);
  if (scoreA !== scoreB) {
    return (scoreA ?? -1) - (scoreB ?? -1);
  }

  const updatedDiff =
    (toDateOrNull(a.updatedAt)?.getTime() ?? 0) - (toDateOrNull(b.updatedAt)?.getTime() ?? 0);
  if (updatedDiff !== 0) {
    return updatedDiff;
  }

  return (toDateOrNull(a.assignedAt)?.getTime() ?? 0) - (toDateOrNull(b.assignedAt)?.getTime() ?? 0);
}

export function collapseEnrollmentRecords<T extends EnrollmentLike>(records: T[]): T {
  if (records.length === 0) {
    throw new Error('collapseEnrollmentRecords requires at least one enrollment record.');
  }

  const canonical = records.reduce((best, current) =>
    compareCanonicalCandidate(current, best) > 0 ? current : best
  );

  const completedModuleIds = Array.from(
    new Set(records.flatMap((record) => normalizeStringArray(record.completedModuleIds)))
  );
  const viewedDocIds = Array.from(
    new Set(records.flatMap((record) => normalizeStringArray(record.viewedDocIds)))
  );
  const progressPct = Math.max(...records.map((record) => normalizeProgressPct(record.progressPct)));
  const studyTimeMs = Math.max(...records.map((record) => normalizeStudyTimeMs(record.studyTimeMs)));
  const status =
    records.reduce((best, record) =>
      getStatusPriority(record.status) > getStatusPriority(best) && typeof record.status === 'string'
        ? record.status
        : best,
    typeof canonical.status === 'string' ? canonical.status : 'assigned') || 'assigned';

  const scoreCandidates = records
    .map((record) => normalizeScore(record.score))
    .filter((value): value is number => value !== null);
  const assignedAtCandidates = records
    .map((record) => toDateOrNull(record.assignedAt))
    .filter((value): value is Date => value instanceof Date);
  const updatedAtCandidates = records
    .map((record) => toDateOrNull(record.updatedAt))
    .filter((value): value is Date => value instanceof Date);
  const completedAtCandidates = records
    .map((record) => toDateOrNull(record.completedAt))
    .filter((value): value is Date => value instanceof Date);

  const merged: Record<string, unknown> = {
    ...canonical,
    progressPct,
    completedModuleIds,
    viewedDocIds,
    status,
    studyTimeMs,
  };

  if (scoreCandidates.length > 0) {
    merged.score = Math.max(...scoreCandidates);
  }

  if (assignedAtCandidates.length > 0) {
    merged.assignedAt = new Date(Math.min(...assignedAtCandidates.map((value) => value.getTime())));
  }

  if (updatedAtCandidates.length > 0) {
    merged.updatedAt = new Date(Math.max(...updatedAtCandidates.map((value) => value.getTime())));
  }

  if (completedAtCandidates.length > 0) {
    merged.completedAt = new Date(Math.min(...completedAtCandidates.map((value) => value.getTime())));
  }

  return merged as T;
}

export function dedupeEnrollmentsByCourse<T extends EnrollmentLike>(records: T[]): T[] {
  const grouped = new Map<string, T[]>();

  records.forEach((record, index) => {
    const key =
      typeof record.courseId === 'string' && record.courseId.trim().length > 0
        ? record.courseId.trim()
        : record.courseId && typeof record.courseId.toString === 'function'
          ? record.courseId.toString()
          : `__missing_course__${index}`;
    const bucket = grouped.get(key);
    if (bucket) {
      bucket.push(record);
      return;
    }

    grouped.set(key, [record]);
  });

  return Array.from(grouped.values()).map((bucket) => collapseEnrollmentRecords(bucket));
}

export function getEnrollmentStudyTimeMs(record: EnrollmentLike): number {
  return normalizeStudyTimeMs(record.studyTimeMs);
}

export function studyHoursFromMs(studyTimeMs: number): number {
  return Math.round((Math.max(0, studyTimeMs) / (60 * 60 * 1000)) * 10) / 10;
}

export function formatStudyHours(studyTimeMs: number): string {
  const hours = studyHoursFromMs(studyTimeMs);
  return Number.isInteger(hours) ? String(hours) : hours.toFixed(1);
}
