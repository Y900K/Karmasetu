import 'dotenv/config';
import { MongoClient, ObjectId } from 'mongodb';

const dryRun = process.argv.includes('--dry-run');
const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB_NAME;

if (!uri || !dbName) {
  throw new Error('Missing MONGODB_URI or MONGODB_DB_NAME in environment variables.');
}

const client = new MongoClient(uri);

const STATUS_PRIORITY = {
  expired: 0,
  assigned: 1,
  in_progress: 2,
  completed: 3,
};

function normalizeProgress(value) {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return 0;
  }

  return Math.max(0, Math.min(100, Math.round(value)));
}

function normalizeStringArray(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((entry) => typeof entry === 'string' && entry.trim().length > 0);
}

function normalizeStudyTimeMs(value) {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return 0;
  }

  return Math.max(0, Math.round(value));
}

function normalizeScore(value) {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return null;
  }

  return Math.max(0, Math.min(100, Math.round(value)));
}

function toDateOrNull(value) {
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

function getStatusPriority(value) {
  return typeof value === 'string' ? STATUS_PRIORITY[value] ?? 0 : 0;
}

function compareCanonicalCandidate(a, b) {
  const progressDiff = normalizeProgress(a.progressPct) - normalizeProgress(b.progressPct);
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

function collapseRecords(records) {
  const canonical = records.reduce((best, current) =>
    compareCanonicalCandidate(current, best) > 0 ? current : best
  );

  const completedModuleIds = Array.from(
    new Set(records.flatMap((record) => normalizeStringArray(record.completedModuleIds)))
  );
  const viewedDocIds = Array.from(
    new Set(records.flatMap((record) => normalizeStringArray(record.viewedDocIds)))
  );
  const progressPct = Math.max(...records.map((record) => normalizeProgress(record.progressPct)));
  const studyTimeMs = Math.max(...records.map((record) => normalizeStudyTimeMs(record.studyTimeMs)));
  const status = records.reduce((best, record) =>
    getStatusPriority(record.status) > getStatusPriority(best) && typeof record.status === 'string'
      ? record.status
      : best,
  typeof canonical.status === 'string' ? canonical.status : 'assigned');

  const scoreCandidates = records
    .map((record) => normalizeScore(record.score))
    .filter((value) => typeof value === 'number');
  const assignedAtCandidates = records
    .map((record) => toDateOrNull(record.assignedAt))
    .filter((value) => value instanceof Date);
  const updatedAtCandidates = records
    .map((record) => toDateOrNull(record.updatedAt))
    .filter((value) => value instanceof Date);
  const completedAtCandidates = records
    .map((record) => toDateOrNull(record.completedAt))
    .filter((value) => value instanceof Date);

  const merged = {
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

  return { keeper: canonical, merged };
}

async function run() {
  await client.connect();
  const db = client.db(dbName);
  const enrollments = db.collection('enrollments');

  const duplicateGroups = await enrollments
    .aggregate([
      {
        $group: {
          _id: { userId: '$userId', courseId: '$courseId' },
          ids: { $push: '$_id' },
          count: { $sum: 1 },
        },
      },
      {
        $match: {
          count: { $gt: 1 },
          '_id.userId': { $type: 'string' },
          '_id.courseId': { $type: 'string' },
        },
      },
      { $sort: { count: -1, '_id.userId': 1, '_id.courseId': 1 } },
    ])
    .toArray();

  if (duplicateGroups.length === 0) {
    console.log('No duplicate enrollment groups found.');
    return;
  }

  console.log(`${dryRun ? '[DRY RUN] ' : ''}Found ${duplicateGroups.length} duplicate enrollment groups.`);

  let groupsProcessed = 0;
  let recordsDeleted = 0;

  for (const group of duplicateGroups) {
    const ids = group.ids.filter((id) => id instanceof ObjectId);
    const records = await enrollments.find({ _id: { $in: ids } }).toArray();
    if (records.length < 2) {
      continue;
    }

    const { keeper, merged } = collapseRecords(records);
    const deleteIds = records
      .filter((record) => record._id.toString() !== keeper._id.toString())
      .map((record) => record._id);

    console.log(
      `- ${group._id.userId} :: ${group._id.courseId} | duplicates=${records.length} | keeper=${keeper._id.toString()}`
    );

    if (!dryRun) {
      await enrollments.updateOne({ _id: keeper._id }, { $set: merged });
      if (deleteIds.length > 0) {
        await enrollments.deleteMany({ _id: { $in: deleteIds } });
      }
    }

    groupsProcessed += 1;
    recordsDeleted += deleteIds.length;
  }

  console.log(
    `${dryRun ? '[DRY RUN] ' : ''}Processed ${groupsProcessed} groups and ${
      dryRun ? 'would delete' : 'deleted'
    } ${recordsDeleted} duplicate enrollment records.`
  );
}

run()
  .catch((error) => {
    console.error('Enrollment dedupe failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await client.close();
  });
