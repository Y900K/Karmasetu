import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getMongoDb } from '@/lib/mongodb';
import { COLLECTIONS } from '@/lib/db/collections';
import { checkRequestRateLimit } from '@/lib/security/requestRateLimit';
import { logSystemEvent } from '@/lib/utils/logger';

function asObjectId(value: unknown): ObjectId | null {
  if (typeof value !== 'string' || !ObjectId.isValid(value)) {
    return null;
  }

  return new ObjectId(value);
}

function formatDate(value: unknown): string | undefined {
  if (!(value instanceof Date)) {
    return undefined;
  }

  return value.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function isValidCertId(certId: string): boolean {
  const normalized = certId.trim();
  return normalized.length > 6 && normalized.length <= 64 && /^[A-Za-z0-9-]+$/.test(normalized);
}

function maskPersonName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return 'Trainee User';
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) {
    return `${parts[0].slice(0, 1)}***`;
  }
  const first = parts[0];
  const second = parts[1];
  return `${first} ${second.slice(0, 1)}***`;
}

export async function GET(request: Request, { params }: { params: Promise<{ certId: string }> }) {
  try {
    const { certId } = await params;
    const ip = (request.headers.get('x-forwarded-for') || 'unknown').split(',')[0].trim() || 'unknown';

    const limiter = checkRequestRateLimit(`cert_verify:${ip}`, {
      maxAttempts: 30,
      windowMs: 10 * 60_000,
      blockMs: 10 * 60_000,
    });

    if (limiter.blocked) {
      await logSystemEvent(
        'WARN',
        'certificate_verify',
        'Rate-limited certificate verification request.',
        { certId: certId.slice(0, 12), ip }
      );

      return NextResponse.json(
        { ok: false, valid: false, message: 'Too many verification requests. Please try again later.' },
        { status: 429 }
      );
    }

    if (!isValidCertId(certId)) {
      await logSystemEvent(
        'WARN',
        'certificate_verify',
        'Rejected invalid certificate identifier format.',
        { certId: certId.slice(0, 12), ip }
      );

      return NextResponse.json(
        { ok: false, valid: false, message: 'Certificate not found.' },
        { status: 404 }
      );
    }

    const db = await getMongoDb();
    const cert = await db.collection(COLLECTIONS.certificates).findOne({ certNo: certId });

    if (cert) {
      const userId = asObjectId(cert.userId);
      const courseId = asObjectId(cert.courseId);

      const [user, course] = await Promise.all([
        userId ? db.collection(COLLECTIONS.users).findOne({ _id: userId }) : null,
        courseId ? db.collection(COLLECTIONS.courses).findOne({ _id: courseId }) : null,
      ]);

      const expiresAt = cert.expiresAt instanceof Date ? cert.expiresAt : undefined;
      const status = typeof cert.status === 'string' ? cert.status : 'valid';
      const isValid = status === 'valid' && (!expiresAt || expiresAt.getTime() > Date.now());

      await logSystemEvent(
        'INFO',
        'certificate_verify',
        'Certificate verification successful.',
        { certId: certId.slice(0, 12), valid: isValid, ip }
      );

      return NextResponse.json({
        ok: true,
        valid: isValid,
        certificate: {
          certNo: cert.certNo,
          trainee: typeof user?.fullName === 'string' ? maskPersonName(user.fullName) : 'Trainee User',
          course: typeof course?.title === 'string' ? course.title : 'Industrial Training Course',
          score: typeof cert.score === 'number' ? cert.score : 0,
          status,
          issueDate: formatDate(cert.issuedAt) || 'NA',
          expiry: formatDate(expiresAt) || 'NA',
        },
      });
    }

    return NextResponse.json(
      {
        ok: false,
        valid: false,
        message: 'Certificate not found.',
      },
      { status: 404 }
    );
  } catch (error) {
    await logSystemEvent(
      'ERROR',
      'certificate_verify',
      'Certificate verification route failed.',
      { error: error instanceof Error ? error.message : 'Unknown error' }
    );

    const details = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      {
        ok: false,
        valid: false,
        message: 'Failed to verify certificate.',
        details: process.env.NODE_ENV === 'development' ? details : undefined,
      },
      { status: 500 }
    );
  }
}
