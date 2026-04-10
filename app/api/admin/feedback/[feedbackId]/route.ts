import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { COLLECTIONS } from '@/lib/db/collections';
import { requireSecureAdminMutation } from '@/lib/security/requireSecureAdminMutation';
import { logSystemEvent } from '@/lib/utils/logger';

type UpdateFeedbackBody = {
  status?: 'open' | 'reviewing' | 'resolved';
  adminNote?: string;
};

const ALLOWED_STATUS = new Set(['open', 'reviewing', 'resolved']);

export async function PATCH(request: Request, context: { params: Promise<{ feedbackId: string }> }) {
  try {
    const admin = await requireSecureAdminMutation(request, 'admin_feedback_update');
    if (!admin.ok) {
      return admin.response;
    }

    const { db, session } = admin;

    const { feedbackId } = await context.params;
    if (!ObjectId.isValid(feedbackId)) {
      await logSystemEvent(
        'WARN',
        'admin_feedback_update',
        'Rejected feedback update due to invalid feedback id.',
        { actorAdminId: session.user._id.toString(), feedbackId },
        session.user._id.toString()
      );
      return NextResponse.json({ ok: false, message: 'Invalid feedback id.' }, { status: 400 });
    }

    const body = (await request.json().catch(() => ({}))) as UpdateFeedbackBody;
    const nextStatus = typeof body.status === 'string' && ALLOWED_STATUS.has(body.status)
      ? body.status
      : undefined;
    const adminNote = typeof body.adminNote === 'string' ? body.adminNote.trim() : undefined;

    if (nextStatus === 'resolved' && (!adminNote || adminNote.length < 5)) {
      await logSystemEvent(
        'WARN',
        'admin_feedback_update',
        'Rejected feedback resolve due to missing/short admin note.',
        { actorAdminId: session.user._id.toString(), feedbackId },
        session.user._id.toString()
      );
      return NextResponse.json(
        { ok: false, message: 'Admin note (min 5 characters) is required before resolving feedback.' },
        { status: 400 }
      );
    }

    if (!nextStatus && !adminNote) {
      await logSystemEvent(
        'WARN',
        'admin_feedback_update',
        'Rejected feedback update because nothing changed.',
        { actorAdminId: session.user._id.toString(), feedbackId },
        session.user._id.toString()
      );
      return NextResponse.json({ ok: false, message: 'Nothing to update.' }, { status: 400 });
    }

    const updateSet: Record<string, unknown> = { updatedAt: new Date() };
    if (nextStatus) {
      updateSet.status = nextStatus;
    }
    if (adminNote) {
      updateSet.adminNote = adminNote;
    }

    const result = await db.collection(COLLECTIONS.traineeFeedback).updateOne(
      { _id: new ObjectId(feedbackId) },
      { $set: updateSet }
    );

    if (result.matchedCount === 0) {
      await logSystemEvent(
        'WARN',
        'admin_feedback_update',
        'Feedback update target not found.',
        { actorAdminId: session.user._id.toString(), feedbackId },
        session.user._id.toString()
      );
      return NextResponse.json({ ok: false, message: 'Feedback not found.' }, { status: 404 });
    }

    await logSystemEvent(
      'INFO',
      'admin_feedback_update',
      'Feedback updated by admin.',
      { actorAdminId: session.user._id.toString(), feedbackId, status: nextStatus || 'unchanged' },
      session.user._id.toString()
    );

    return NextResponse.json({ ok: true, message: 'Feedback updated.' });
  } catch (error) {
    await logSystemEvent(
      'ERROR',
      'admin_feedback_update',
      'Feedback update route failed.',
      { error: error instanceof Error ? error.message : 'Unknown error' }
    );

    const details = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      {
        ok: false,
        message: 'Failed to update feedback.',
        details: process.env.NODE_ENV === 'development' ? details : undefined,
      },
      { status: 500 }
    );
  }
}
