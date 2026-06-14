import { COLLECTIONS } from '@/lib/db/collections';
import type { Db } from 'mongodb';

/**
 * Ensures all required MongoDB indexes are created in the database.
 * This is the single canonical source of truth for database indexes.
 */
export async function ensureMongoIndexes(db: Db) {
  await Promise.all([
    // Users
    db.collection(COLLECTIONS.users).createIndex({ email: 1 }, { unique: true, sparse: true, name: 'uniq_user_email' }),
    db.collection(COLLECTIONS.users).createIndex({ phone: 1 }, { unique: true, sparse: true, name: 'uniq_user_phone' }),
    db.collection(COLLECTIONS.users).createIndex({ createdAt: -1 }, { name: 'idx_user_created_at' }),

    // Courses
    db.collection(COLLECTIONS.courses).createIndex({ code: 1 }, { unique: true, name: 'uniq_course_code' }),
    db.collection(COLLECTIONS.courses).createIndex({ isPublished: 1, isDeleted: 1, createdAt: -1 }, { name: 'idx_course_published_deleted_created' }),
    db.collection(COLLECTIONS.courses).createIndex({ deadline: 1 }, { name: 'idx_course_deadline' }),

    // Enrollments
    db.collection(COLLECTIONS.enrollments).createIndex({ userId: 1, courseId: 1 }, { name: 'idx_enrollment_user_course' }),
    db.collection(COLLECTIONS.enrollments).createIndex({ userId: 1, courseId: 1, status: 1 }, { name: 'idx_enrollment_user_course_status' }),
    db.collection(COLLECTIONS.enrollments).createIndex({ courseId: 1, status: 1 }, { name: 'idx_enrollment_course_status' }),
    db.collection(COLLECTIONS.enrollments).createIndex({ userId: 1, updatedAt: -1 }, { name: 'idx_enrollment_user_updated' }),

    // Enrollment Audit
    db.collection(COLLECTIONS.enrollmentAudit).createIndex({ createdAt: -1 }, { name: 'idx_enrollment_audit_created_at' }),
    db.collection(COLLECTIONS.enrollmentAudit).createIndex({ userId: 1, createdAt: -1 }, { name: 'idx_enrollment_audit_user' }),
    db.collection(COLLECTIONS.enrollmentAudit).createIndex({ courseId: 1, createdAt: -1 }, { name: 'idx_enrollment_audit_course' }),

    // Auth Audit
    db.collection(COLLECTIONS.authAudit).createIndex({ createdAt: -1 }, { name: 'idx_auth_audit_created_at' }),
    db.collection(COLLECTIONS.authAudit).createIndex({ identifier: 1, createdAt: -1 }, { name: 'idx_auth_audit_identifier' }),
    db.collection(COLLECTIONS.authAudit).createIndex({ createdAt: 1 }, { expireAfterSeconds: 7776000, name: 'ttl_auth_audit_90d' }),

    // Feedback
    db.collection(COLLECTIONS.traineeFeedback).createIndex({ createdAt: -1 }, { name: 'idx_feedback_created_at' }),
    db.collection(COLLECTIONS.traineeFeedback).createIndex({ status: 1, createdAt: -1 }, { name: 'idx_feedback_status' }),

    // Notifications
    db.collection(COLLECTIONS.adminNotifications).createIndex({ createdAt: -1 }, { name: 'idx_admin_notification_created_at' }),
    db.collection(COLLECTIONS.adminNotifications).createIndex({ status: 1, createdAt: -1 }, { name: 'idx_admin_notification_status' }),

    // Announcements
    db.collection(COLLECTIONS.adminAnnouncements).createIndex({ createdAt: -1 }, { name: 'idx_admin_announcement_created_at' }),
    db.collection(COLLECTIONS.adminAnnouncements).createIndex({ status: 1, createdAt: -1 }, { name: 'idx_admin_announcement_status' }),
    db.collection(COLLECTIONS.adminAnnouncements).createIndex({ priority: 1, createdAt: -1 }, { name: 'idx_admin_announcement_priority' }),
    db.collection(COLLECTIONS.adminAnnouncements).createIndex({ scheduledAt: 1 }, { name: 'idx_admin_announcement_scheduled_at' }),

    // Certificates
    db.collection(COLLECTIONS.certificates).createIndex({ certNo: 1 }, { unique: true, name: 'uniq_certificate_cert_no' }),
    db.collection(COLLECTIONS.certificates).createIndex({ userId: 1, courseId: 1, status: 1 }, { name: 'idx_certificate_user_course_status' }),
    db.collection(COLLECTIONS.certificates).createIndex({ verificationHash: 1 }, { unique: true, name: 'uniq_certificate_verify_hash' }),
    db.collection(COLLECTIONS.certificates).createIndex({ issuedAt: -1 }, { name: 'idx_certificate_issued_at' }),

    // Sessions
    db.collection(COLLECTIONS.sessions).createIndex({ tokenFingerprint: 1 }, { unique: true, sparse: true, name: 'uniq_session_token_fingerprint' }),
    db.collection(COLLECTIONS.sessions).createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0, name: 'ttl_session_expiry' }),

    // Password Resets
    db.collection(COLLECTIONS.passwordResets).createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0, name: 'ttl_password_resets_expiry' }),
  ]);

  return { ok: true };
}
