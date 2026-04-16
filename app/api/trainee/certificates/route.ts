import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { COLLECTIONS } from '@/lib/db/collections';
import { requireTrainee } from '@/lib/auth/requireTrainee';

function formatDate(date: unknown): string {
  if (!(date instanceof Date)) {
    return 'NA';
  }

  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function toUiStatus(status: unknown, expiresAt: unknown): 'Valid' | 'Expired' | 'Revoked' {
  if (status === 'revoked') {
    return 'Revoked';
  }

  if (expiresAt instanceof Date && expiresAt.getTime() < Date.now()) {
    return 'Expired';
  }

  return 'Valid';
}

function toObjectId(value: unknown): ObjectId | null {
  if (typeof value !== 'string' || !ObjectId.isValid(value)) {
    return null;
  }

  return new ObjectId(value);
}

export async function GET(request: Request) {
  try {
    const trainee = await requireTrainee(request);
    if (!trainee.ok) {
      return trainee.response;
    }

    const { db, session } = trainee;

    const userId = session.user._id.toString();
    const certificates = await db
      .collection(COLLECTIONS.certificates)
      .find({ userId, isRemovedByTrainee: { $ne: true } })
      .sort({ issuedAt: -1 })
      .toArray();

    const courseIds = certificates
      .map((certificate) => toObjectId(certificate.courseId))
      .filter((id): id is ObjectId => Boolean(id));

    const courses = courseIds.length
      ? await db.collection(COLLECTIONS.courses).find({ _id: { $in: courseIds } }).toArray()
      : [];

    const courseMap = new Map(courses.map((course) => [course._id.toString(), course]));

    const records = certificates.map((certificate) => {
      const course =
        typeof certificate.courseId === 'string' ? courseMap.get(certificate.courseId) : undefined;
      const status = toUiStatus(certificate.status, certificate.expiresAt);

      return {
        id: typeof certificate.certNo === 'string' ? certificate.certNo : userId,
        certNo: typeof certificate.certNo === 'string' ? certificate.certNo : 'NA',
        trainee:
          typeof session.user.fullName === 'string' ? session.user.fullName : 'Trainee User',
        course:
          typeof course?.title === 'string'
            ? course.title
            : typeof certificate.courseName === 'string'
            ? certificate.courseName
            : 'Industrial Training Course',
        icon: typeof course?.icon === 'string' ? course.icon : '🎓',
        theme:
          typeof course?.theme === 'string' ? course.theme : 'from-cyan-600 to-sky-500',
        score: typeof certificate.score === 'number' ? certificate.score : 100,
        issueDate: formatDate(certificate.issuedAt),
        expiry: formatDate(certificate.expiresAt),
        status,
        courseRemoved: !course || course.isDeleted === true,
      };
    });

    return NextResponse.json({ ok: true, certificates: records });
  } catch (error) {
    const details = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      {
        ok: false,
        message: 'Failed to load trainee certificates.',
        details: process.env.NODE_ENV === 'development' ? details : undefined,
      },
      { status: 500 }
    );
  }
}
