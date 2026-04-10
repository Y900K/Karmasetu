import { getMongoDb } from '@/lib/mongodb';
import { COLLECTIONS } from '@/lib/db/collections';

export async function ensureMongoIndexes() {
  const db = await getMongoDb();

  await Promise.all([
    db.collection(COLLECTIONS.users).createIndex({ email: 1 }, { unique: true, sparse: true, name: 'uniq_user_email' }),
    db.collection(COLLECTIONS.users).createIndex({ phone: 1 }, { unique: true, sparse: true, name: 'uniq_user_phone' }),
    db.collection(COLLECTIONS.users).createIndex({ createdAt: -1 }, { name: 'idx_user_created_at' }),

    db.collection(COLLECTIONS.courses).createIndex({ code: 1 }, { unique: true, name: 'uniq_course_code' }),
    db.collection(COLLECTIONS.courses).createIndex({ isPublished: 1 }, { name: 'idx_course_published' }),
    db.collection(COLLECTIONS.courses).createIndex({ createdAt: -1 }, { name: 'idx_course_created_at' }),

    db.collection(COLLECTIONS.enrollments).createIndex({ userId: 1, courseId: 1 }, { unique: true, name: 'uniq_enrollment_user_course' }),
    db.collection(COLLECTIONS.enrollments).createIndex({ courseId: 1, status: 1 }, { name: 'idx_enrollment_course_status' }),

    db.collection(COLLECTIONS.enrollmentAudit).createIndex({ createdAt: -1 }, { name: 'idx_enrollment_audit_created_at' }),
    db.collection(COLLECTIONS.enrollmentAudit).createIndex({ userId: 1, createdAt: -1 }, { name: 'idx_enrollment_audit_user' }),
    db.collection(COLLECTIONS.enrollmentAudit).createIndex({ courseId: 1, createdAt: -1 }, { name: 'idx_enrollment_audit_course' }),
    db.collection(COLLECTIONS.enrollmentAudit).createIndex({ action: 1, createdAt: -1 }, { name: 'idx_enrollment_audit_action' }),

    db.collection(COLLECTIONS.authAudit).createIndex({ createdAt: -1 }, { name: 'idx_auth_audit_created_at' }),
    db.collection(COLLECTIONS.authAudit).createIndex({ identifier: 1, createdAt: -1 }, { name: 'idx_auth_audit_identifier' }),
    db.collection(COLLECTIONS.authAudit).createIndex({ action: 1, createdAt: -1 }, { name: 'idx_auth_audit_action' }),
    db.collection(COLLECTIONS.authAudit).createIndex({ ip: 1, createdAt: -1 }, { name: 'idx_auth_audit_ip' }),

    db.collection(COLLECTIONS.traineeFeedback).createIndex({ createdAt: -1 }, { name: 'idx_feedback_created_at' }),
    db.collection(COLLECTIONS.traineeFeedback).createIndex({ userId: 1, createdAt: -1 }, { name: 'idx_feedback_user' }),
    db.collection(COLLECTIONS.traineeFeedback).createIndex({ status: 1, createdAt: -1 }, { name: 'idx_feedback_status' }),
    db.collection(COLLECTIONS.traineeFeedback).createIndex({ category: 1, createdAt: -1 }, { name: 'idx_feedback_category' }),

    db.collection(COLLECTIONS.adminNotifications).createIndex({ createdAt: -1 }, { name: 'idx_admin_notification_created_at' }),
    db.collection(COLLECTIONS.adminNotifications).createIndex({ status: 1, createdAt: -1 }, { name: 'idx_admin_notification_status' }),
    db.collection(COLLECTIONS.adminNotifications).createIndex({ category: 1, createdAt: -1 }, { name: 'idx_admin_notification_category' }),
    db.collection(COLLECTIONS.adminNotifications).createIndex({ 'metadata.identifier': 1, createdAt: -1 }, { name: 'idx_admin_notification_identifier' }),

    db.collection(COLLECTIONS.adminAnnouncements).createIndex({ createdAt: -1 }, { name: 'idx_admin_announcement_created_at' }),
    db.collection(COLLECTIONS.adminAnnouncements).createIndex({ status: 1, createdAt: -1 }, { name: 'idx_admin_announcement_status' }),
    db.collection(COLLECTIONS.adminAnnouncements).createIndex({ priority: 1, createdAt: -1 }, { name: 'idx_admin_announcement_priority' }),
    db.collection(COLLECTIONS.adminAnnouncements).createIndex({ scheduledAt: 1 }, { name: 'idx_admin_announcement_scheduled_at' }),

    db.collection(COLLECTIONS.certificates).createIndex({ certNo: 1 }, { unique: true, name: 'uniq_certificate_cert_no' }),
    db.collection(COLLECTIONS.certificates).createIndex({ userId: 1 }, { name: 'idx_certificate_user' }),
    db.collection(COLLECTIONS.certificates).createIndex(
      { userId: 1, courseId: 1 },
      {
        unique: true,
        partialFilterExpression: { status: { $ne: 'revoked' } },
        name: 'uniq_certificate_user_course_active',
      }
    ),
    db.collection(COLLECTIONS.certificates).createIndex({ verificationHash: 1 }, { unique: true, name: 'uniq_certificate_verify_hash' }),
    db.collection(COLLECTIONS.certificates).createIndex({ issuedAt: -1 }, { name: 'idx_certificate_issued_at' }),

    db.collection(COLLECTIONS.sessions).createIndex({ userId: 1 }, { name: 'idx_session_user' }),
    db.collection(COLLECTIONS.sessions).createIndex({ tokenFingerprint: 1 }, { unique: true, sparse: true, name: 'uniq_session_token_fingerprint' }),
    db.collection(COLLECTIONS.sessions).createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0, name: 'ttl_session_expiry' }),
  ]);

  return { ok: true };
}
