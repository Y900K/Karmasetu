import { NextResponse } from 'next/server';
import { ObjectId, type Db } from 'mongodb';
import { COLLECTIONS } from '@/lib/db/collections';
import {
  buildTokenFingerprint,
  generateSessionToken,
  hashSecret,
  verifySecret,
} from '@/lib/auth/security';

const SESSION_COOKIE = 'ks_session';
const DEFAULT_SESSION_TTL_DAYS = 1;

function buildSessionExpiryDate(): { expiresAt: Date; maxAgeSeconds: number } {
  const ttlDays = DEFAULT_SESSION_TTL_DAYS;
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + ttlDays);
  return { expiresAt, maxAgeSeconds: ttlDays * 24 * 60 * 60 };
}

export async function createSession(db: Db, userId: string, userAgent?: string) {
  const token = generateSessionToken();
  const tokenHash = hashSecret(token);
  const tokenFingerprint = buildTokenFingerprint(token);
  const { expiresAt, maxAgeSeconds } = buildSessionExpiryDate();

  // Session rotation policy: retain only the newest active session per user.
  await db.collection(COLLECTIONS.sessions).deleteMany({ userId });

  await db.collection(COLLECTIONS.sessions).insertOne({
    userId,
    tokenHash,
    tokenFingerprint,
    expiresAt,
    createdAt: new Date(),
    userAgent,
  });

  return { token, expiresAt, maxAgeSeconds };
}

export function applySessionCookie(
  response: NextResponse,
  token: string,
  expiresAt: Date,
  maxAgeSeconds?: number
) {
  const resolvedMaxAge = maxAgeSeconds ?? Math.floor((expiresAt.getTime() - Date.now()) / 1000);

  response.cookies.set({
    name: SESSION_COOKIE,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production' && process.env.VERCEL === '1',
    sameSite: 'lax',
    path: '/',
    maxAge: resolvedMaxAge,
    priority: 'high',
    expires: expiresAt,
  });
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set({
    name: SESSION_COOKIE,
    value: '',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production' && process.env.VERCEL === '1',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
    priority: 'high',
    expires: new Date(0),
  });
}

export function getSessionTokenFromRequest(request: Request): string | null {
  const cookieHeader = request.headers.get('cookie');
  if (!cookieHeader) {
    return null;
  }

  const parts = cookieHeader.split(';').map((part) => part.trim());
  for (const part of parts) {
    if (part.startsWith(`${SESSION_COOKIE}=`)) {
      try {
        return decodeURIComponent(part.slice(SESSION_COOKIE.length + 1));
      } catch {
        return part.slice(SESSION_COOKIE.length + 1);
      }
    }
  }

  return null;
}

export async function resolveSessionUser(db: Db, request: Request) {
  const token = getSessionTokenFromRequest(request);
  if (!token) {
    return null;
  }

  const tokenFingerprint = buildTokenFingerprint(token);
  const sessionsCollection = db.collection(COLLECTIONS.sessions);

  const directSession = await sessionsCollection.findOne({
    tokenFingerprint,
    expiresAt: { $gt: new Date() },
  });

  let activeSession = directSession;

  if (!activeSession) {
    const legacySessions = await sessionsCollection
      .find({ expiresAt: { $gt: new Date() } })
      .toArray();

    activeSession = legacySessions.find((session) =>
      typeof session.tokenHash === 'string' && verifySecret(token, session.tokenHash)
    ) ?? null;
  }

  if (!activeSession || typeof activeSession.userId !== 'string') {
    return null;
  }

  const userId = activeSession.userId;
  const users = db.collection(COLLECTIONS.users);

  let user = null;
  if (ObjectId.isValid(userId)) {
    user = await users.findOne({ _id: new ObjectId(userId) });
  }

  if (!user) {
    return null;
  }

  if (user.isActive === false) {
    await sessionsCollection.deleteMany({ userId });
    return null;
  }

  return {
    user,
    sessionId: activeSession._id,
  };
}
