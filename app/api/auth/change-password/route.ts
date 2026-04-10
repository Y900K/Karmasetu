import { NextResponse } from 'next/server';
import { getMongoDb } from '@/lib/mongodb';
import { COLLECTIONS } from '@/lib/db/collections';
import { clearSessionCookie, resolveSessionUser } from '@/lib/auth/session';
import { hashSecret } from '@/lib/auth/security';
import { getPasswordPolicyError } from '@/lib/auth/passwordPolicy';
import { isAllowedWriteOrigin } from '@/lib/security/originGuard';

export async function POST(request: Request) {
  try {
    if (!isAllowedWriteOrigin(request, { requireOrigin: true })) {
      return NextResponse.json({ ok: false, message: 'Invalid request origin.' }, { status: 403 });
    }

    const db = await getMongoDb();
    const sessionToken = await resolveSessionUser(db, request);
    if (!sessionToken) {
      return NextResponse.json({ ok: false, message: 'Unauthorized. Please log in.' }, { status: 401 });
    }

    const body = await request.json();
    const { newPassword } = body;

    if (!newPassword) {
      return NextResponse.json({ ok: false, message: 'New password is required.' }, { status: 400 });
    }

    const passwordError = getPasswordPolicyError(newPassword);
    if (passwordError) {
      return NextResponse.json({ ok: false, message: passwordError }, { status: 400 });
    }

    const users = db.collection(COLLECTIONS.users);
    const userId = sessionToken.user._id;

    await users.updateOne(
      { _id: userId },
      { 
        $set: { 
          passwordHash: hashSecret(newPassword),
          updatedAt: new Date()
        } 
      }
    );

    await db.collection(COLLECTIONS.sessions).deleteMany({ userId: userId.toString() });

    const response = NextResponse.json({
      ok: true,
      message: 'Password updated successfully. Please sign in again.',
    });

    clearSessionCookie(response);
    return response;
  } catch (error) {
    console.error('Change Password Error:', error);
    return NextResponse.json({ ok: false, message: 'Internal Server Error' }, { status: 500 });
  }
}
