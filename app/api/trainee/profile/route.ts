import { NextResponse } from 'next/server';
import { COLLECTIONS } from '@/lib/db/collections';
import { normalizePhone } from '@/lib/auth/security';
import { dedupeEnrollmentsByCourse, getEnrollmentStudyTimeMs } from '@/lib/enrollmentMetrics';
import { requireTrainee } from '@/lib/auth/requireTrainee';

type ProfilePatchBody = {
  name?: string;
  phone?: string;
  department?: string;
  bio?: string;
  languagePreference?: 'EN' | 'HINGLISH';
  profilePhotoUrl?: string;
};

export async function GET(request: Request) {
  try {
    const trainee = await requireTrainee(request);
    if (!trainee.ok) {
      return trainee.response;
    }

    const { db, session } = trainee;

    const userId = session.user._id.toString();
    const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);

    const [rawEnrollments, certificates, auditLogs] = await Promise.all([
      db.collection(COLLECTIONS.enrollments).find({ userId }).toArray(),
      db.collection(COLLECTIONS.certificates).find({ userId, status: { $ne: 'revoked' } }).toArray(),
      db.collection(COLLECTIONS.enrollmentAudit)
        .find({ userId, createdAt: { $gte: fortyEightHoursAgo } })
        .sort({ createdAt: -1 })
        .limit(5)
        .toArray()
    ]);
    const enrollments = dedupeEnrollmentsByCourse(rawEnrollments);

    const allEvents: Array<{ text: string; time: string; color: string; date: Date }> = [];

    for (const log of auditLogs) {
      let text = 'Performed an activity';
      let color = 'cyan';
      
      if (log.action === 'progress_updated') {
        text = `Course progress updated to ${log.progressPct}%`;
      } else if (log.action === 'enrolled') {
        text = 'Enrolled in a new course';
        color = 'gold';
      } else if (log.action === 'completed') {
        text = `Completed course with score ${log.score || 100}%`;
        color = 'emerald';
      } else if (log.action === 'assigned_by_admin') {
        text = 'Assigned new course by Admin';
        color = 'gold';
      }

      allEvents.push({
        text,
        time: log.createdAt instanceof Date ? log.createdAt.toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Recently',
        color,
        date: log.createdAt instanceof Date ? log.createdAt : new Date(),
      });
    }

    const recentCerts = certificates.filter(c => c.issuedAt instanceof Date && c.issuedAt.getTime() >= fortyEightHoursAgo.getTime());
    for (const cert of recentCerts) {
      allEvents.push({
        text: 'Earned a new certificate',
        time: cert.issuedAt.toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }),
        color: 'cyan',
        date: cert.issuedAt,
      });
    }

    allEvents.sort((a, b) => b.date.getTime() - a.date.getTime());
    const recentActivity = allEvents.slice(0, 3).map(({ text, time, color }) => ({ text, time, color }));

    const completedCount = enrollments.filter((entry) => entry.status === 'completed').length;
    const averageProgress = enrollments.length
      ? Math.round(
          enrollments.reduce(
            (sum, entry) => sum + (typeof entry.progressPct === 'number' ? entry.progressPct : 0),
            0
          ) / enrollments.length
        )
      : 0;
    const studyTimeMs = enrollments.reduce((sum, entry) => sum + getEnrollmentStudyTimeMs(entry), 0);

    const rawName = session.user.fullName || session.user.name;
    const fullName =
      typeof rawName === 'string' && rawName.trim().length > 0
        ? rawName.trim()
        : 'Trainee User';
    const approvalStatus =
      typeof session.user.approvalStatus === 'string' ? session.user.approvalStatus : 'approved';
    const accessLevel = approvalStatus === 'pending' ? 'basic' : 'full';

    return NextResponse.json({
      ok: true,
      profile: {
        id: userId,
        name: fullName,
        firstName: fullName.split(' ')[0] || 'Trainee',
        email: typeof session.user.email === 'string' ? session.user.email : '',
        role: typeof session.user.role === 'string' ? session.user.role : 'trainee',
        department: typeof session.user.department === 'string' ? session.user.department : 'General',
        avatar: fullName
          .split(' ')
          .map((part: string) => part[0])
          .join('')
          .slice(0, 2)
          .toUpperCase(),
        phone: typeof session.user.phone === 'string' ? session.user.phone : '',
        bio: typeof session.user.bio === 'string' ? session.user.bio : '',
        profilePhotoUrl:
          typeof session.user.profilePhotoUrl === 'string' ? session.user.profilePhotoUrl : '',
        languagePreference:
          session.user.languagePreference === 'HINGLISH' ? 'HINGLISH' : 'EN',
        approvalStatus,
        accessLevel,
        authMessage:
          approvalStatus === 'pending'
            ? 'Your account is under review. You can access default courses right away.'
            : 'Your account is fully approved.',
        completedCount,
        totalEnrollments: enrollments.length,
        averageProgress,
        studyTimeMs,
        certCount: certificates.length,
        recentActivity,
      },
    });
  } catch (error) {
    const details = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      {
        ok: false,
        message: 'Failed to load profile.',
        details: process.env.NODE_ENV === 'development' ? details : undefined,
      },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const trainee = await requireTrainee(request);
    if (!trainee.ok) {
      return trainee.response;
    }

    const { db, session } = trainee;

    const body = (await request.json().catch(() => ({}))) as ProfilePatchBody;
    const name = body.name?.trim();
    const hasPhoneField = typeof body.phone === 'string';
    const hasDepartmentField = typeof body.department === 'string';
    const hasBioField = typeof body.bio === 'string';
    const hasProfilePhotoField = typeof body.profilePhotoUrl === 'string';
    const rawPhone = typeof body.phone === 'string' ? body.phone.trim() : undefined;
    const phone = rawPhone ? normalizePhone(rawPhone) : '';
    const department = typeof body.department === 'string' ? body.department.trim() : '';
    const bio = typeof body.bio === 'string' ? body.bio.trim().slice(0, 200) : '';
    const profilePhotoUrl =
      typeof body.profilePhotoUrl === 'string' ? body.profilePhotoUrl.trim().slice(0, 500) : '';
    const languagePreference =
      body.languagePreference === 'HINGLISH' ? 'HINGLISH' : body.languagePreference === 'EN' ? 'EN' : undefined;

    if (!name || name.length < 2) {
      return NextResponse.json({ ok: false, message: 'Valid name is required.' }, { status: 400 });
    }

    if (rawPhone && !phone) {
      return NextResponse.json({ ok: false, message: 'Invalid phone format.' }, { status: 400 });
    }

    const updateSet: Record<string, unknown> = {
      fullName: name,
      updatedAt: new Date(),
    };

    if (hasDepartmentField) {
      updateSet.department = department || 'General';
    }

    if (hasBioField) {
      updateSet.bio = bio;
    }

    if (hasProfilePhotoField) {
      updateSet.profilePhotoUrl = profilePhotoUrl;
    }

    if (typeof languagePreference === 'string') {
      updateSet.languagePreference = languagePreference;
    }

    if (phone) {
      updateSet.phone = phone;
    }

    const updateUnset: Record<string, ''> = {};
    if (hasPhoneField && !phone) {
      updateUnset.phone = '';
    }

    const updateDoc: Record<string, unknown> = { $set: updateSet };
    if (Object.keys(updateUnset).length > 0) {
      updateDoc.$unset = updateUnset;
    }

    await db.collection(COLLECTIONS.users).updateOne({ _id: session.user._id }, updateDoc);

    return NextResponse.json({ ok: true, message: 'Profile updated.' });
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
