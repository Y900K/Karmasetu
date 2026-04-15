import { NextResponse } from 'next/server';
import { COLLECTIONS, type UserRole } from '@/lib/db/collections';
import { hashSecret, normalizeEmail, normalizePhone } from '@/lib/auth/security';
import { getPasswordPolicyError } from '@/lib/auth/passwordPolicy';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { requireSecureAdminMutation } from '@/lib/security/requireSecureAdminMutation';
import { logSystemEvent } from '@/lib/utils/logger';

type CreateUserBody = {
  name?: string;
  role?: string;
  dept?: string;
  phone?: string;
  email?: string;
  password?: string;
};

type UserRow = {
  id: string;
  name: string;
  email: string;
  department: string;
  role: string;
  progress: number;
  status: 'Active' | 'Overdue' | 'Inactive';
  approvalStatus: 'approved' | 'restricted' | 'pending';
  lastLogin: string;
  phone: string;
};

const USER_ROLE_MAP: Record<string, UserRole> = {
  'Worker / Operator': 'operator',
  'Supervisor / Team Lead': 'manager',
  'Manager / Department Head': 'manager',
  'Safety Officer': 'hse',
  'HR / Admin': 'admin',
};

function maskEmail(email?: string): string {
  if (!email) return 'none';
  const [local = '', domain = 'unknown'] = email.split('@');
  if (!local) return `***@${domain}`;
  return `${local.slice(0, 1)}***@${domain}`;
}

function roleToDisplay(value: unknown): string {
  if (typeof value !== 'string') {
    return 'Worker / Operator';
  }

  switch (value) {
    case 'admin':
      return 'HR / Admin';
    case 'manager':
      return 'Manager / Department Head';
    case 'hse':
      return 'Safety Officer';
    case 'operator':
      return 'Worker / Operator';
    case 'contractor':
      return 'Worker / Operator';
    case 'trainee':
    default:
      return 'Worker / Operator';
  }
}

function computeStatus(isActive: unknown, hasOverdue: boolean): 'Active' | 'Overdue' | 'Inactive' {
  if (!isActive) {
    return 'Inactive';
  }

  if (hasOverdue) {
    return 'Overdue';
  }

  return 'Active';
}

function formatLastLogin(updatedAt: unknown): string {
  if (!(updatedAt instanceof Date)) {
    return 'Never';
  }

  return updatedAt.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export async function GET(request: Request) {
  try {
    const admin = await requireAdmin(request);
    if (!admin.ok) {
      return admin.response;
    }

    const { db } = admin;

    const [users, rawEnrollments, courses] = await Promise.all([
      db.collection(COLLECTIONS.users).find({ role: { $ne: 'admin' } }).sort({ createdAt: -1 }).toArray(),
      db.collection(COLLECTIONS.enrollments).find({}).project({ userId: 1, courseId: 1, progressPct: 1, status: 1 }).toArray(),
      // Allow deleted courses so historical progress isn't artificially lowered when courses are removed
      db.collection(COLLECTIONS.courses).find({}).project({ _id: 1, deadline: 1 }).toArray(),
    ]);

    const courseDeadlineMap = new Map<string, number>();
    for (const c of courses) {
      const cid = typeof c._id === 'object' ? c._id.toString() : c._id;
      if (c.deadline) {
        courseDeadlineMap.set(cid, (c.deadline instanceof Date ? c.deadline : new Date(c.deadline)).getTime());
      }
    }

    const progressAndOverdueMap = new Map<string, { totalProgress: number; count: number; hasOverdue: boolean }>();
    const nowMs = Date.now();

    for (const e of rawEnrollments) {
      const uid = typeof e.userId === 'string' ? e.userId : '';
      if (!uid) continue;

      const current = progressAndOverdueMap.get(uid) || { totalProgress: 0, count: 0, hasOverdue: false };
      
      current.totalProgress += (typeof e.progressPct === 'number' ? e.progressPct : 0);
      current.count += 1;

      if (e.status !== 'completed') {
        const courseId = typeof e.courseId === 'string' ? e.courseId : '';
        const deadlineMs = courseDeadlineMap.get(courseId);
        if (deadlineMs && deadlineMs < nowMs) {
          current.hasOverdue = true;
        }
      }

      progressAndOverdueMap.set(uid, current);
    }
    
    // ...

    const rows: UserRow[] = users.map((user) => {
      const id = user._id.toString();
      const stats = progressAndOverdueMap.get(id) || { totalProgress: 0, count: 0, hasOverdue: false };
      const progress = stats.count > 0 ? Math.round(stats.totalProgress / stats.count) : 0;
      const isOverdue = stats.hasOverdue;

      const approvalStatus =
        user.approvalStatus === 'restricted' || user.approvalStatus === 'pending' || user.approvalStatus === 'approved'
          ? user.approvalStatus
          : 'approved';

      return {
        id,
        name: typeof user.fullName === 'string' ? user.fullName : 'User',
        email: typeof user.email === 'string' ? user.email : '-',
        department: typeof user.department === 'string' ? user.department : 'General',
        role: roleToDisplay(user.role),
        progress,
        status: computeStatus(user.isActive !== false, isOverdue),
        approvalStatus,
        lastLogin: formatLastLogin(user.updatedAt),
        phone: typeof user.phone === 'string' ? user.phone : '-',
      };
    });

    return NextResponse.json({ ok: true, users: rows });
  } catch (error) {
    const details = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      {
        ok: false,
        message: 'Failed to load users.',
        details: process.env.NODE_ENV === 'development' ? details : undefined,
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const admin = await requireSecureAdminMutation(request, 'admin_user_create');
    if (!admin.ok) {
      return admin.response;
    }

    const { db, session } = admin;

    const body = (await request.json()) as CreateUserBody;
    const name = body.name?.trim();
    const email = body.email ? normalizeEmail(body.email) : undefined;
    const phone = body.phone ? normalizePhone(body.phone) : undefined;
    const password = body.password?.trim();

    if (!name || !email || !password) {
      await logSystemEvent(
        'WARN',
        'admin_user_create',
        'Rejected user creation due to missing required fields.',
        { actorAdminId: session.user._id.toString(), email: maskEmail(email) },
        session.user._id.toString()
      );
      return NextResponse.json(
        { ok: false, message: 'Name, email and password are required.' },
        { status: 400 }
      );
    }

    const passwordError = getPasswordPolicyError(password);
    if (passwordError) {
      await logSystemEvent(
        'WARN',
        'admin_user_create',
        'Rejected user creation due to password policy.',
        { actorAdminId: session.user._id.toString(), email: maskEmail(email) },
        session.user._id.toString()
      );
      return NextResponse.json({ ok: false, message: passwordError }, { status: 400 });
    }

    const users = db.collection(COLLECTIONS.users);

    const duplicate = await users.findOne({
      $or: [
        { email },
        ...(phone ? [{ phone }] : []),
      ],
    });

    if (duplicate) {
      await logSystemEvent(
        'WARN',
        'admin_user_create',
        'Rejected user creation due to duplicate email/phone.',
        { actorAdminId: session.user._id.toString(), email: maskEmail(email) },
        session.user._id.toString()
      );
      return NextResponse.json(
        { ok: false, message: 'User already exists with this email or phone.' },
        { status: 409 }
      );
    }

    const role = USER_ROLE_MAP[body.role || ''] || 'trainee';
    const now = new Date();

    const result = await users.insertOne({
      fullName: name,
      email,
      phone,
      passwordHash: hashSecret(password),
      role,
      department: body.dept?.trim() || 'General',
      company: 'KarmaSetu',
      approvalStatus: 'approved',
      accessLevel: 'full',
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    await logSystemEvent(
      'INFO',
      'admin_user_create',
      'User created by admin.',
      {
        actorAdminId: session.user._id.toString(),
        userId: result.insertedId.toString(),
        role,
        department: body.dept?.trim() || 'General',
      },
      session.user._id.toString()
    );

    return NextResponse.json({
      ok: true,
      message: 'User created successfully.',
      userId: result.insertedId.toString(),
    });
  } catch (error) {
    await logSystemEvent(
      'ERROR',
      'admin_user_create',
      'Admin user creation route failed.',
      { error: error instanceof Error ? error.message : 'Unknown error' }
    );

    const details = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      {
        ok: false,
        message: 'Failed to create user.',
        details: process.env.NODE_ENV === 'development' ? details : undefined,
      },
      { status: 500 }
    );
  }
}
