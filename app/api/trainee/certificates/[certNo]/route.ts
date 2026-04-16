import { NextResponse } from 'next/server';
import { COLLECTIONS } from '@/lib/db/collections';
import { requireTrainee } from '@/lib/auth/requireTrainee';

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ certNo: string }> }
) {
  try {
    const trainee = await requireTrainee(request);
    if (!trainee.ok) {
      return trainee.response;
    }

    const { db, session } = trainee;
    const { certNo } = await params;
    const userId = session.user._id.toString();

    // Instead of absolute deletion, we mark it as removed by the trainee
    // so administrators can still find it if needed for audit, but
    // it disappears from the trainee's dashboard.
    const result = await db.collection(COLLECTIONS.certificates).updateOne(
      { certNo, userId },
      { $set: { isRemovedByTrainee: true, removedAt: new Date() } }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { ok: false, message: 'Certificate not found.' },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true, message: 'Certificate removed from dashboard.' });
  } catch (error) {
    const details = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      {
        ok: false,
        message: 'Failed to remove certificate.',
        details: process.env.NODE_ENV === 'development' ? details : undefined,
      },
      { status: 500 }
    );
  }
}
