import { NextResponse } from 'next/server';
import { COLLECTIONS } from '@/lib/db/collections';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { isAllowedWriteOrigin } from '@/lib/security/originGuard';
import { logSystemEvent } from '@/lib/utils/logger';

function isValidCertNo(certNo: string): boolean {
  const normalized = certNo.trim();
  return normalized.length > 6 && normalized.length <= 64 && /^[A-Za-z0-9-]+$/.test(normalized);
}

export async function POST(request: Request, { params }: { params: Promise<{ certNo: string }> }) {
  try {
    if (!isAllowedWriteOrigin(request)) {
      await logSystemEvent('WARN', 'admin_certificate_revoke', 'Blocked revoke request due to invalid origin.');
      return NextResponse.json({ ok: false, message: 'Invalid request origin.' }, { status: 403 });
    }

    const admin = await requireAdmin(request);
    if (!admin.ok) {
      return admin.response;
    }

    const { db, session } = admin;
    const { certNo } = await params;
    if (!certNo || !isValidCertNo(certNo)) {
      await logSystemEvent(
        'WARN',
        'admin_certificate_revoke',
        'Rejected revoke request due to invalid certificate number.',
        { actorAdminId: session.user._id.toString(), certNo: certNo?.slice(0, 12) || 'none' },
        session.user._id.toString()
      );
      return NextResponse.json({ ok: false, message: 'Certificate number is required.' }, { status: 400 });
    }

    const result = await db.collection(COLLECTIONS.certificates).updateOne(
      { certNo },
      {
        $set: {
          status: 'revoked',
          revokedAt: new Date(),
        },
      }
    );

    if (!result.matchedCount) {
      await logSystemEvent(
        'WARN',
        'admin_certificate_revoke',
        'Certificate revoke target not found.',
        { actorAdminId: session.user._id.toString(), certNo: certNo.slice(0, 12) },
        session.user._id.toString()
      );
      return NextResponse.json({ ok: false, message: 'Certificate not found.' }, { status: 404 });
    }

    await logSystemEvent(
      'INFO',
      'admin_certificate_revoke',
      'Certificate revoked by admin.',
      { actorAdminId: session.user._id.toString(), certNo: certNo.slice(0, 12) },
      session.user._id.toString()
    );

    return NextResponse.json({ ok: true, message: 'Certificate revoked.' });
  } catch (error) {
    await logSystemEvent(
      'ERROR',
      'admin_certificate_revoke',
      'Certificate revoke route failed.',
      { error: error instanceof Error ? error.message : 'Unknown error' }
    );

    const details = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      {
        ok: false,
        message: 'Failed to revoke certificate.',
        details: process.env.NODE_ENV === 'development' ? details : undefined,
      },
      { status: 500 }
    );
  }
}
