import type { Db } from 'mongodb';
import { COLLECTIONS } from './db/collections';

export type NotificationType = 
  | 'trainee_enrollment' 
  | 'trainee_completion' 
  | 'trainee_feedback' 
  | 'course_assigned' 
  | 'certificate_earned' 
  | 'deadline_reminder' 
  | 'security_alert';

export type NotificationLevel = 'INFO' | 'HIGH' | 'CRITICAL';

export interface NotificationPayload {
  userId?: string; // Optional for broadcasts
  role: 'admin' | 'trainee';
  type: NotificationType;
  level?: NotificationLevel;
  title: string;
  desc: string;
  link?: string;
  metadata?: Record<string, unknown>;
}

export async function createNotification(db: Db, payload: NotificationPayload) {
  const {
    userId,
    role,
    type,
    level = 'INFO',
    title,
    desc,
    link,
    metadata = {}
  } = payload;

  const now = new Date();

  const result = await db.collection(COLLECTIONS.adminNotifications).insertOne({
    userId: userId || null, // null means broadcast to role
    role,
    type,
    level,
    title,
    desc,
    link,
    status: 'open',
    createdAt: now,
    updatedAt: now,
    metadata
  });

  return result;
}

export async function getUnreadNotifications(db: Db, userId: string, role: 'admin' | 'trainee', limit = 20) {
  return db.collection(COLLECTIONS.adminNotifications)
    .find({ 
      role, 
      status: 'open',
      $or: [
        { userId },
        { userId: null }
      ]
    })
    .sort({ createdAt: -1 })
    .limit(limit)
    .toArray();
}

export async function markNotificationAsRead(db: Db, notificationId: string, userId: string) {
  const { ObjectId } = await import('mongodb');
  return db.collection(COLLECTIONS.adminNotifications).updateOne(
    { _id: new ObjectId(notificationId), userId },
    { $set: { status: 'read', updatedAt: new Date() } }
  );
}
