import { NextResponse } from 'next/server';
import { getMongoDb } from '@/lib/mongodb';
import { COLLECTIONS } from '@/lib/db/collections';
import { createSession, applySessionCookie } from '@/lib/auth/session';
import { normalizeEmail, verifySecret } from '@/lib/auth/security';
import { checkLoginRateLimit, clearLoginAttempts, recordFailedLogin } from '@/lib/auth/loginRateLimit';
import { maybeRaiseMultiIpFailedLoginAlert } from '@/lib/security/loginAnomalyAlerts';
import { isLearnerRole } from '@/lib/auth/learnerRoles';
import { isAllowedWriteOrigin } from '@/lib/security/originGuard';

type LoginRequest = {
  identifier?: string;
  password?: string;
  role?: 'trainee' | 'admin';
  rememberMe?: boolean;
};

type AuthAuditAction = 'login_success' | 'login_failed' | 'login_rate_limited';
const PERSISTENT_RATE_WINDOW_MS = 60 * 60 * 1000;
const PERSISTENT_BLOCK_MS = 30 * 60 * 1000;
const PERSISTENT_MAX_ATTEMPTS = 3;

async function logAuthAudit(
  action: AuthAuditAction,
  options: {
    identifier?: string;
    roleRequested: 'trainee' | 'admin';
    userId?: string;
    ip?: string;
    userAgent?: string;
    reason?: string;
  }
) {
  try {
    const db = await getMongoDb();
    await db.collection(COLLECTIONS.authAudit).insertOne({
      action,
      identifier: options.identifier,
      roleRequested: options.roleRequested,
      userId: options.userId,
      source: 'email_password',
      ip: options.ip,
      userAgent: options.userAgent,
      reason: options.reason,
      createdAt: new Date(),
    });
  } catch {
    // Best-effort audit logging should never break authentication flow.
  }
}

async function getPersistentLoginBlockState(db: Awaited<ReturnType<typeof getMongoDb>>, identifier: string) {
  const authAudit = db.collection(COLLECTIONS.authAudit);
  const now = Date.now();

  const lastSuccess = await authAudit.findOne(
    { identifier, action: 'login_success' },
    { sort: { createdAt: -1 }, projection: { createdAt: 1 } }
  );

  const failedQuery: Record<string, unknown> = {
    identifier,
    action: 'login_failed',
    createdAt: { $gte: new Date(now - PERSISTENT_RATE_WINDOW_MS) },
  };

  if (lastSuccess?.createdAt instanceof Date) {
    failedQuery.createdAt = {
      $gte: new Date(Math.max(now - PERSISTENT_RATE_WINDOW_MS, lastSuccess.createdAt.getTime())),
    };
  }

  const latestFailedAttempts = await authAudit
    .find(failedQuery, { projection: { createdAt: 1 } })
    .sort({ createdAt: -1 })
    .limit(PERSISTENT_MAX_ATTEMPTS)
    .toArray();

  if (latestFailedAttempts.length < PERSISTENT_MAX_ATTEMPTS) {
    return { blocked: false as const };
  }

  const lockAnchor = latestFailedAttempts[latestFailedAttempts.length - 1]?.createdAt;
  if (!(lockAnchor instanceof Date)) {
    return { blocked: false as const };
  }

  const blockedUntil = lockAnchor.getTime() + PERSISTENT_BLOCK_MS;
  if (blockedUntil <= now) {
    return { blocked: false as const };
  }

  return {
    blocked: true as const,
    retryAfterSec: Math.max(1, Math.ceil((blockedUntil - now) / 1000)),
  };
}

export async function POST(request: Request) {
  try {
    if (!isAllowedWriteOrigin(request, { requireOrigin: true })) {
      return NextResponse.json({ ok: false, message: 'Invalid request origin.' }, { status: 403 });
    }

    const body = (await request.json()) as LoginRequest;
    const identifier = body.identifier?.trim();
    const password = body.password?.trim();
    const role = body.role || 'trainee';
    const ip = (request.headers.get('x-forwarded-for') || 'unknown').split(',')[0].trim() || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    if (!identifier || !password) {
      return NextResponse.json({ ok: false, message: 'Identifier and password are required.' }, { status: 400 });
    }

    if (!identifier.includes('@')) {
      return NextResponse.json({ ok: false, message: 'Email and password login is required.' }, { status: 400 });
    }

    const normalizedEmail = normalizeEmail(identifier);
    const rateLimitKey = `${normalizedEmail}:${ip}:${userAgent}`;
    const rateStatus = checkLoginRateLimit(rateLimitKey);
    if (rateStatus.blocked) {
      const minutesLeft = Math.ceil((rateStatus.retryAfterSec || 1800) / 60);
      await logAuthAudit('login_rate_limited', {
        identifier: normalizedEmail,
        roleRequested: role,
        ip,
        userAgent,
        reason: 'too_many_attempts_30m_block',
      });

      return NextResponse.json(
        {
          ok: false,
          message: `Too many failed login attempts. For your security, this account is temporarily locked. Please try again in ${minutesLeft} minutes.`,
        },
        { status: 429 }
      );
    }

    const db = await getMongoDb();
    const persistentRateStatus = await getPersistentLoginBlockState(db, normalizedEmail);
    if (persistentRateStatus.blocked) {
      const minutesLeft = Math.ceil((persistentRateStatus.retryAfterSec || 1800) / 60);
      await logAuthAudit('login_rate_limited', {
        identifier: normalizedEmail,
        roleRequested: role,
        ip,
        userAgent,
        reason: 'persistent_too_many_attempts_30m_block',
      });

      return NextResponse.json(
        {
          ok: false,
          message: `Too many failed login attempts. For your security, this account is temporarily locked. Please try again in ${minutesLeft} minutes.`,
        },
        { status: 429 }
      );
    }

    const users = db.collection(COLLECTIONS.users);
    const query = { email: normalizedEmail };

    const user = await users.findOne(query);
    if (!user) {
      recordFailedLogin(rateLimitKey);
      await logAuthAudit('login_failed', {
        identifier: normalizedEmail,
        roleRequested: role,
        ip,
        userAgent,
        reason: 'user_not_found',
      });
      await maybeRaiseMultiIpFailedLoginAlert(db, normalizedEmail);
      return NextResponse.json(
        { ok: false, message: 'Incorrect email or password. Please try again.' },
        { status: 401 }
      );
    }

    if (role === 'admin' && user.role !== 'admin') {
      recordFailedLogin(rateLimitKey);
      await logAuthAudit('login_failed', {
        identifier: normalizedEmail,
        roleRequested: role,
        userId: user._id.toString(),
        ip,
        userAgent,
        reason: 'role_mismatch',
      });
      await maybeRaiseMultiIpFailedLoginAlert(db, normalizedEmail);
      return NextResponse.json(
        { ok: false, message: 'This account is not an admin account.' },
        { status: 403 }
      );
    }

    if (role === 'trainee' && user.role === 'admin') {
      recordFailedLogin(rateLimitKey);
      await logAuthAudit('login_failed', {
        identifier: normalizedEmail,
        roleRequested: role,
        userId: user._id.toString(),
        ip,
        userAgent,
        reason: 'role_mismatch',
      });
      return NextResponse.json(
        { ok: false, message: 'This account is an admin account. Please switch to the Admin tab.' },
        { status: 403 }
      );
    }

    if (role === 'trainee' && !isLearnerRole(user.role)) {
      recordFailedLogin(rateLimitKey);
      await logAuthAudit('login_failed', {
        identifier: normalizedEmail,
        roleRequested: role,
        userId: user._id.toString(),
        ip,
        userAgent,
        reason: 'unsupported_learner_role',
      });
      return NextResponse.json(
        { ok: false, message: 'This account role is not enabled for trainee portal access.' },
        { status: 403 }
      );
    }

    let forcePasswordChange = false;

    if (typeof user.passwordHash !== 'string' || !verifySecret(password, user.passwordHash)) {
      // Recovery Code Fallback (2-minute auto-expiry logic)
      const resets = db.collection(COLLECTIONS.passwordResets);
      const resetCode = await resets.findOne({
        userId: user._id.toString(),
        code: password,
        expiresAt: { $gt: new Date() }
      });

      if (!resetCode) {
        recordFailedLogin(rateLimitKey);
        await logAuthAudit('login_failed', {
          identifier: normalizedEmail,
          roleRequested: role,
          userId: user._id.toString(),
          ip,
          userAgent,
          reason: 'invalid_password_or_expired_code',
        });
        await maybeRaiseMultiIpFailedLoginAlert(db, normalizedEmail);
        return NextResponse.json(
          { ok: false, message: 'Incorrect email or password/code. Please try again.' },
          { status: 401 }
        );
      } else {
        // Successful code match! Auto-delete the code so it cannot be reused.
        await resets.deleteOne({ _id: resetCode._id });
        forcePasswordChange = true;
      }
    }

    clearLoginAttempts(rateLimitKey);
    await logAuthAudit('login_success', {
      identifier: normalizedEmail,
      roleRequested: role,
      userId: user._id.toString(),
      ip,
      userAgent,
    });

    const session = await createSession(
      db,
      user._id.toString(),
      request.headers.get('user-agent') || undefined,
      body.rememberMe === true
    );
    const approvalStatus = typeof user.approvalStatus === 'string' ? user.approvalStatus : 'approved';
    const accessLevel = approvalStatus === 'pending' ? 'basic' : 'full';

    const response = NextResponse.json({
      ok: true,
      message: 'Login successful.',
      user: {
        id: user._id.toString(),
        fullName: typeof user.fullName === 'string' ? user.fullName : 'User',
        email: typeof user.email === 'string' ? user.email : undefined,
        phone: typeof user.phone === 'string' ? user.phone : undefined,
        role: typeof user.role === 'string' ? user.role : 'trainee',
      },
      auth: {
        status: approvalStatus,
        access: accessLevel,
        forcePasswordChange,
        message:
          approvalStatus === 'pending'
            ? 'Account verification is pending. You can continue with default courses immediately.'
            : 'Your account is fully approved.',
      },
    });

    applySessionCookie(response, session.token, session.expiresAt, session.maxAgeSeconds);
    return response;
  } catch (error) {
    const details = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      {
        ok: false,
        message: 'Failed to login.',
        details: process.env.NODE_ENV === 'development' ? details : undefined,
      },
      { status: 500 }
    );
  }
}
