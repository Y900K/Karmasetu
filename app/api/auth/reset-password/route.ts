import { NextResponse } from 'next/server';
import { getMongoDb } from '@/lib/mongodb';
import { COLLECTIONS } from '@/lib/db/collections';
import { getPasswordPolicyError } from '@/lib/auth/passwordPolicy';
import { hashSecret, normalizeEmail } from '@/lib/auth/security';
import { checkRequestRateLimit } from '@/lib/security/requestRateLimit';
import { isAllowedWriteOrigin } from '@/lib/security/originGuard';
import { logSystemEvent } from '@/lib/utils/logger';

type ResetPasswordRequest = {
  email?: string;
  code?: string;
  newPassword?: string;
};

function maskEmail(email: string): string {
  const [local = '', domain = 'unknown'] = email.split('@');
  if (!local) return `***@${domain}`;
  return `${local.slice(0, 1)}***@${domain}`;
}

export async function POST(request: Request) {
  try {
    if (!isAllowedWriteOrigin(request)) {
      await logSystemEvent('WARN', 'reset_password', 'Blocked reset-password request due to invalid origin.');
      return NextResponse.json({ ok: false, message: 'Invalid request origin.' }, { status: 403 });
    }

    const body = (await request.json()) as ResetPasswordRequest;
    const email = body.email ? normalizeEmail(body.email) : '';
    const code = typeof body.code === 'string' ? body.code.trim() : '';
    const newPassword = typeof body.newPassword === 'string' ? body.newPassword : '';
    const ip = (request.headers.get('x-forwarded-for') || 'unknown').split(',')[0].trim() || 'unknown';

    const limiter = checkRequestRateLimit(`reset_password:${ip}:${email || 'none'}`, {
      maxAttempts: 6,
      windowMs: 15 * 60_000,
      blockMs: 30 * 60_000,
    });

    if (limiter.blocked) {
      await logSystemEvent(
        'WARN',
        'reset_password',
        'Rate-limited reset-password request.',
        { ip, email: email ? maskEmail(email) : 'none' }
      );

      return NextResponse.json(
        { ok: false, message: 'Too many reset attempts. Please try again later.' },
        { status: 429 }
      );
    }

    if (!email || !code || !newPassword) {
      await logSystemEvent(
        'WARN',
        'reset_password',
        'Rejected reset-password request due to missing fields.',
        { ip, email: email ? maskEmail(email) : 'none' }
      );

      return NextResponse.json(
        { ok: false, message: 'Email, code, and new password are required.' },
        { status: 400 }
      );
    }

    const passwordError = getPasswordPolicyError(newPassword);
    if (passwordError) {
      await logSystemEvent(
        'WARN',
        'reset_password',
        'Rejected reset-password due to password policy violation.',
        { ip, email: maskEmail(email) }
      );

      return NextResponse.json({ ok: false, message: passwordError }, { status: 400 });
    }

    const db = await getMongoDb();
    const user = await db.collection(COLLECTIONS.users).findOne({ email });

    if (!user) {
      await logSystemEvent(
        'WARN',
        'reset_password',
        'Rejected reset-password due to unknown email.',
        { ip, email: maskEmail(email) }
      );

      return NextResponse.json({ ok: false, message: 'Invalid email or code.' }, { status: 400 });
    }

    const resetRecord = await db.collection(COLLECTIONS.passwordResets).findOne({
      userId: user._id.toString(),
      code,
      expiresAt: { $gt: new Date() },
    });

    if (!resetRecord) {
      await logSystemEvent(
        'WARN',
        'reset_password',
        'Rejected reset-password due to invalid or expired code.',
        { ip, userId: user._id.toString() },
        user._id.toString()
      );

      return NextResponse.json({ ok: false, message: 'Invalid or expired reset code.' }, { status: 400 });
    }

    await db.collection(COLLECTIONS.users).updateOne(
      { _id: user._id },
      {
        $set: {
          passwordHash: hashSecret(newPassword),
          updatedAt: new Date(),
        },
      }
    );

    await db.collection(COLLECTIONS.passwordResets).deleteMany({ userId: user._id.toString() });

    await logSystemEvent(
      'INFO',
      'reset_password',
      'Password reset completed successfully.',
      { ip, userId: user._id.toString() },
      user._id.toString()
    );

    return NextResponse.json({
      ok: true,
      message: 'Password has been reset successfully. Please sign in.',
    });
  } catch (error) {
    await logSystemEvent(
      'ERROR',
      'reset_password',
      'Reset-password route failed.',
      { error: error instanceof Error ? error.message : 'Unknown error' }
    );

    const details = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      {
        ok: false,
        message: 'Failed to reset password.',
        details: process.env.NODE_ENV === 'development' ? details : undefined,
      },
      { status: 500 }
    );
  }
}
