import type { ObjectId } from 'mongodb';

export const COLLECTIONS = {
  users: 'users',
  courses: 'courses',
  enrollments: 'enrollments',
  enrollmentAudit: 'enrollment_audit',
  authAudit: 'auth_audit',
  traineeFeedback: 'trainee_feedback',
  adminNotifications: 'admin_notifications',
  adminAnnouncements: 'admin_announcements',
  certificates: 'certificates',
  sessions: 'sessions',
  passwordResets: 'password_resets',
  systemLogs: 'system_logs',
  systemConfig: 'system_config',
} as const;

export type UserRole = 'trainee' | 'operator' | 'contractor' | 'hse' | 'manager' | 'admin';

export interface UserDoc {
  _id?: string;
  fullName: string;
  email?: string;
  phone?: string;
  passwordHash?: string;
  role: UserRole;
  department?: string;
  company?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CourseDoc {
  _id?: string | ObjectId;
  code: string;
  title: string;
  category?: string;
  level?: string;
  version: number;
  modulesCount: number;
  isPublished: boolean;
  isDeleted?: boolean;
  deadline?: Date;
  theme?: string;
  icon?: string;
  description?: string;
  instructorName?: string;
  instructorRole?: string;
  objectives?: string[];
  thumbnail?: string;
  thumbnailMeta?: {
    provider: string;
    keywords?: string[];
    url: string;
  };
  passingScore?: number;
  departments?: string[];
  isDefaultForNewTrainees?: boolean;
  modules: Array<{
    id: string;
    type: 'video' | 'pdf' | 'quiz' | 'interactive';
    title: string;
    content: string;
    order: number;
    required: boolean;
    duration?: string;
  }>;
  quiz?: {
    questions: Array<{
      text: string;
      options: string[];
      correct: number;
      explanation?: string;
    }>;
  };
  quizTimeLimit?: number;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  externalId?: string;
}

export interface EnrollmentDoc {
  _id?: string;
  userId: string;
  courseId: string;
  progressPct: number;
  completedModuleIds: string[];
  score?: number;
  status: 'assigned' | 'in_progress' | 'completed' | 'expired';
  assignedAt: Date;
  completedAt?: Date;
  updatedAt: Date;
}

export interface EnrollmentAuditDoc {
  _id?: string;
  userId: string;
  courseId: string;
  action: 'assigned_by_admin' | 'enrolled' | 'progress_updated' | 'completed';
  actorUserId?: string;
  progressPct?: number;
  score?: number;
  source: 'admin_api' | 'trainee_api' | 'system';
  createdAt: Date;
  metadata?: Record<string, unknown>;
}

export interface AuthAuditDoc {
  _id?: string;
  action: 'login_success' | 'login_failed' | 'login_rate_limited';
  identifier?: string;
  roleRequested: 'trainee' | 'admin';
  userId?: string;
  source: 'email_password';
  ip?: string;
  userAgent?: string;
  reason?: string;
  createdAt: Date;
}

export interface AdminNotificationDoc {
  _id?: string;
  category: 'security' | 'compliance' | 'system';
  level: 'HIGH' | 'MEDIUM' | 'INFO';
  title: string;
  desc: string;
  action?: string;
  status: 'open' | 'dismissed' | 'resolved';
  createdAt: Date;
  metadata?: Record<string, unknown>;
}

export interface TraineeFeedbackDoc {
  _id?: string;
  userId: string;
  userName: string;
  userEmail?: string;
  category: 'suggestion' | 'issue' | 'feature' | 'general';
  message: string;
  rating?: number;
  status: 'open' | 'reviewing' | 'resolved';
  createdAt: Date;
  updatedAt: Date;
  adminNote?: string;
}

export interface CertificateDoc {
  _id?: string;
  certNo: string;
  userId: string;
  courseId: string;
  issuedAt: Date;
  expiresAt?: Date;
  score: number;
  status: 'valid' | 'expired' | 'revoked';
  verificationHash: string;
}

export interface SessionDoc {
  _id?: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  createdAt: Date;
  userAgent?: string;
  ipHash?: string;
}
