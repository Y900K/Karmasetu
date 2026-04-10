import { NextResponse } from 'next/server';
import { getMongoDb } from '@/lib/mongodb';
import { COLLECTIONS } from '@/lib/db/collections';
import { normalizeEmail } from '@/lib/auth/security';
import { checkRequestRateLimit } from '@/lib/security/requestRateLimit';
import { isAllowedWriteOrigin } from '@/lib/security/originGuard';
import { logSystemEvent } from '@/lib/utils/logger';

type ForgotPasswordRequest = {
  email?: string;
};

function generateResetCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function maskEmail(email: string): string {
  const [local = '', domain = 'unknown'] = email.split('@');
  if (!local) return `***@${domain}`;
  return `${local.slice(0, 1)}***@${domain}`;
}

export async function POST(request: Request) {
  try {
    if (!isAllowedWriteOrigin(request, { requireOrigin: true })) {
      await logSystemEvent('WARN', 'forgot_password', 'Blocked forgot-password request due to invalid origin.');
      return NextResponse.json({ ok: false, message: 'Invalid request origin.' }, { status: 403 });
    }

    const body = (await request.json()) as ForgotPasswordRequest;
    const email = body.email ? normalizeEmail(body.email) : '';
    const ip = (request.headers.get('x-forwarded-for') || 'unknown').split(',')[0].trim() || 'unknown';

    const limiter = checkRequestRateLimit(`forgot_password:${ip}:${email || 'none'}`, {
      maxAttempts: 5,
      windowMs: 15 * 60_000,
      blockMs: 30 * 60_000,
    });

    if (limiter.blocked) {
      await logSystemEvent(
        'WARN',
        'forgot_password',
        'Rate-limited forgot-password request.',
        { ip, email: email ? maskEmail(email) : 'none' }
      );

      return NextResponse.json(
        { ok: false, message: 'Too many reset requests. Please try again later.' },
        { status: 429 }
      );
    }

    if (!email) {
      await logSystemEvent('WARN', 'forgot_password', 'Rejected forgot-password request due to missing email.', { ip });
      return NextResponse.json({ ok: false, message: 'Email is required.' }, { status: 400 });
    }

    const db = await getMongoDb();
    const user = await db.collection(COLLECTIONS.users).findOne({ email });

    if (!user) {
      await logSystemEvent(
        'INFO',
        'forgot_password',
        'Processed forgot-password request for non-existent account.',
        { ip, email: maskEmail(email) }
      );

      return NextResponse.json({
        ok: true,
        message: 'If this email exists, a reset code has been generated.',
      });
    }

    const code = generateResetCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await db.collection(COLLECTIONS.passwordResets).updateOne(
      { userId: user._id.toString() },
      {
        $set: {
          userId: user._id.toString(),
          code,
          expiresAt,
          createdAt: new Date(),
        },
      },
      { upsert: true }
    );

    await logSystemEvent(
      'INFO',
      'forgot_password',
      'Generated password reset code.',
      { ip, userId: user._id.toString(), email: maskEmail(email) },
      user._id.toString()
    );

    return NextResponse.json({
      ok: true,
      message: 'If this email exists, a reset code has been generated.',
      code: process.env.NODE_ENV === 'production' ? undefined : code,
    });
  } catch (error) {
    await logSystemEvent(
      'ERROR',
      'forgot_password',
      'Forgot-password route failed.',
      { error: error instanceof Error ? error.message : 'Unknown error' }
    );

    const details = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      {
        ok: false,
        message: 'Failed to process forgot-password request.',
        details: process.env.NODE_ENV === 'development' ? details : undefined,
      },
      { status: 500 }
    );
  }
}
