import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { COLLECTIONS } from '@/lib/db/collections';
import { requireSecureAdminMutation } from '@/lib/security/requireSecureAdminMutation';
import { logSystemEvent } from '@/lib/utils/logger';

type UpdateAlertBody = {
  status?: 'dismissed' | 'resolved';
};

const ALLOWED_STATUS = new Set(['dismissed', 'resolved']);

export async function PATCH(request: Request, context: { params: Promise<{ alertId: string }> }) {
  try {
    const admin = await requireSecureAdminMutation(request, 'admin_alert_update');
    if (!admin.ok) {
      return admin.response;
    }

    const { db, session } = admin;

    const { alertId } = await context.params;
    if (!ObjectId.isValid(alertId)) {
      await logSystemEvent(
        'WARN',
        'admin_alert_update',
        'Rejected alert update due to invalid alert id.',
        { actorAdminId: session.user._id.toString(), alertId },
        session.user._id.toString()
      );
      return NextResponse.json({ ok: false, message: 'Invalid alert id.' }, { status: 400 });
    }

    const body = (await request.json().catch(() => ({}))) as UpdateAlertBody;
    const status = typeof body.status === 'string' && ALLOWED_STATUS.has(body.status)
      ? body.status
      : undefined;

    if (!status) {
      await logSystemEvent(
        'WARN',
        'admin_alert_update',
        'Rejected alert update due to invalid status.',
        { actorAdminId: session.user._id.toString(), alertId },
        session.user._id.toString()
      );
      return NextResponse.json({ ok: false, message: 'Invalid status.' }, { status: 400 });
    }

    const result = await db.collection(COLLECTIONS.adminNotifications).updateOne(
      { _id: new ObjectId(alertId) },
      { $set: { status, updatedAt: new Date() } }
    );

    if (result.matchedCount === 0) {
      await logSystemEvent(
        'WARN',
        'admin_alert_update',
        'Alert update target not found.',
        { actorAdminId: session.user._id.toString(), alertId },
        session.user._id.toString()
      );
      return NextResponse.json({ ok: false, message: 'Alert not found.' }, { status: 404 });
    }

    await logSystemEvent(
      'INFO',
      'admin_alert_update',
      'Alert updated by admin.',
      { actorAdminId: session.user._id.toString(), alertId, status },
      session.user._id.toString()
    );

    return NextResponse.json({ ok: true, message: 'Alert updated.' });
  } catch (error) {
    await logSystemEvent(
      'ERROR',
      'admin_alert_update',
      'Alert update route failed.',
      { error: error instanceof Error ? error.message : 'Unknown error' }
    );

    const details = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      {
        ok: false,
        message: 'Failed to update alert.',
        details: process.env.NODE_ENV === 'development' ? details : undefined,
      },
      { status: 500 }
    );
  }
}
