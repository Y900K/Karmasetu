import { NextResponse } from 'next/server';
import { getMongoDb } from '@/lib/mongodb';
import { clearSessionCookie, resolveSessionUser } from '@/lib/auth/session';
import { COLLECTIONS } from '@/lib/db/collections';

export async function GET(request: Request) {
  try {
    const db = await getMongoDb();
    const sessionData = await resolveSessionUser(db, request);

    if (!sessionData) {
      const response = NextResponse.json({ ok: false, message: 'Not authenticated.' }, { status: 401 });
      clearSessionCookie(response);
      return response;
    }

    const { user } = sessionData;
    const approvalStatus = typeof user.approvalStatus === 'string' ? user.approvalStatus : 'approved';
    const accessLevel = approvalStatus === 'pending' ? 'basic' : 'full';
    return NextResponse.json({
      ok: true,
      user: {
        id: user._id.toString(),
        fullName: typeof user.fullName === 'string' ? user.fullName : 'User',
        email: typeof user.email === 'string' ? user.email : undefined,
        phone: typeof user.phone === 'string' ? user.phone : undefined,
        role: typeof user.role === 'string' ? user.role : 'trainee',
        department: typeof user.department === 'string' ? user.department : undefined,
        company: typeof user.company === 'string' ? user.company : undefined,
        approvalStatus,
        accessLevel,
      },
      auth: {
        status: approvalStatus,
        access: accessLevel,
      },
    });
  } catch (error) {
    const details = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      {
        ok: false,
        message: 'Failed to read session.',
        details: process.env.NODE_ENV === 'development' ? details : undefined,
      },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const db = await getMongoDb();
    const sessionData = await resolveSessionUser(db, request);

    if (!sessionData) {
      return NextResponse.json({ ok: false, message: 'Not authenticated.' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { name, phone, department } = body;

    const updateSet: Record<string, unknown> = {
      updatedAt: new Date()
    };

    if (typeof name === 'string' && name.trim()) {
      updateSet.fullName = name.trim();
    }
    if (typeof phone === 'string') {
      updateSet.phone = phone.trim();
    }
    if (typeof department === 'string' && department.trim()) {
      updateSet.department = department.trim();
    }

    await db.collection(COLLECTIONS.users).updateOne(
      { _id: sessionData.user._id },
      { $set: updateSet }
    );

    return NextResponse.json({ ok: true, message: 'Profile updated successfully.' });
  } catch (error) {
    const details = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      {
        ok: false,
        message: 'Failed to update profile.',
        details: process.env.NODE_ENV === 'development' ? details : undefined,
      },
      { status: 500 }
    );
  }
}
