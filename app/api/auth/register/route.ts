import { NextResponse } from 'next/server';
import { getMongoDb } from '@/lib/mongodb';
import { COLLECTIONS, type UserRole } from '@/lib/db/collections';
import { ObjectId, type Db, type Filter } from 'mongodb';
import { createSession, applySessionCookie } from '@/lib/auth/session';
import { hashSecret, normalizeEmail } from '@/lib/auth/security';
import { getPasswordPolicyError } from '@/lib/auth/passwordPolicy';
import { isAllowedWriteOrigin } from '@/lib/security/originGuard';

const ALLOWED_ROLES = new Set<UserRole>(['trainee', 'operator', 'contractor', 'hse', 'manager']);

type RegisterRequest = {
  fullName?: string;
  email?: string;
  password?: string;
  role?: UserRole;
  department?: string;
  company?: string;
  phone?: string;
};

type DefaultCourseSeed = {
  _id: { toString: () => string };
  title?: string;
};

async function rollbackNewUserArtifacts(db: Db, userId: string) {
  const userFilter: Filter<{ _id: ObjectId | string }> = ObjectId.isValid(userId)
    ? { _id: new ObjectId(userId) }
    : { _id: userId };
  await Promise.allSettled([
    db.collection<{ _id: ObjectId | string }>(COLLECTIONS.users).deleteOne(userFilter),
    db.collection(COLLECTIONS.enrollments).deleteMany({ userId }),
    db.collection(COLLECTIONS.enrollmentAudit).deleteMany({ userId }),
    db.collection(COLLECTIONS.sessions).deleteMany({ userId }),
  ]);
}

export async function POST(request: Request) {
  try {
    if (!isAllowedWriteOrigin(request, { requireOrigin: true })) {
      return NextResponse.json({ ok: false, message: 'Invalid request origin.' }, { status: 403 });
    }

    const body = (await request.json()) as RegisterRequest;

    const fullName = body.fullName?.trim();
    const email = body.email ? normalizeEmail(body.email) : undefined;
    const password = body.password?.trim();
    const role = body.role && ALLOWED_ROLES.has(body.role) ? body.role : 'trainee';
    const department = body.department?.trim();
    const company = body.company?.trim();
    const phone = body.phone?.trim();

    if (!fullName || fullName.length < 2) {
      return NextResponse.json({ ok: false, message: 'Full name is required.' }, { status: 400 });
    }

    if (!email) {
      return NextResponse.json({ ok: false, message: 'Email is required.' }, { status: 400 });
    }

    if (!password) {
      return NextResponse.json(
        { ok: false, message: 'Password is required.' },
        { status: 400 }
      );
    }

    if (!department) {
      return NextResponse.json({ ok: false, message: 'Department selection is required.' }, { status: 400 });
    }

    if (!company) {
      return NextResponse.json({ ok: false, message: 'Company / facility name is required.' }, { status: 400 });
    }

    const passwordError = getPasswordPolicyError(password);
    if (passwordError) {
      return NextResponse.json({ ok: false, message: passwordError }, { status: 400 });
    }

    const db = await getMongoDb();
    const users = db.collection(COLLECTIONS.users);

    const duplicate = await users.findOne({
      email,
    });

    if (duplicate) {
      return NextResponse.json(
        { ok: false, message: 'User already exists with this email.' },
        { status: 409 }
      );
    }

    const now = new Date();
    const result = await users.insertOne({
      fullName,
      email,
      passwordHash: password ? hashSecret(password) : undefined,
      role,
      department,
      company,
      phone: phone || '',
      approvalStatus: 'pending',
      accessLevel: 'basic',
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    const userId = result.insertedId.toString();

    const courses = db.collection(COLLECTIONS.courses);
    const enrollments = db.collection(COLLECTIONS.enrollments);
    const enrollmentAudit = db.collection(COLLECTIONS.enrollmentAudit);

    const explicitDefaultCourses = await courses
      .find({
        isPublished: { $ne: false },
        isDeleted: { $ne: true },
        isDefaultForNewTrainees: true,
      })
      .project({ _id: 1, title: 1 })
      .sort({ createdAt: 1 })
      .limit(10)
      .toArray() as DefaultCourseSeed[];

    const inferredDefaultCourses = explicitDefaultCourses.length
      ? explicitDefaultCourses
      : await courses
          .find({
            isPublished: { $ne: false },
            isDeleted: { $ne: true },
            $or: [
              { departments: { $in: ['All Departments', department] } },
              { category: { $regex: 'safety|compliance|induction', $options: 'i' } },
            ],
          })
          .project({ _id: 1, title: 1 })
          .sort({ createdAt: 1 })
          .limit(6)
          .toArray() as DefaultCourseSeed[];

    const defaultCourses = inferredDefaultCourses.length
      ? inferredDefaultCourses
      : await courses
          .find({
            isPublished: { $ne: false },
            isDeleted: { $ne: true },
          })
          .project({ _id: 1, title: 1 })
          .sort({ createdAt: 1 })
          .limit(3)
          .toArray() as DefaultCourseSeed[];

    try {
      if (defaultCourses.length > 0) {
        await enrollments.bulkWrite(
          defaultCourses.map((course) => ({
            updateOne: {
              filter: { userId, courseId: course._id.toString() },
              update: {
                $setOnInsert: {
                  userId,
                  courseId: course._id.toString(),
                  progressPct: 0,
                  completedModuleIds: [],
                  department,
                  assignedAt: now,
                },
                $set: {
                  status: 'assigned',
                  updatedAt: now,
                },
              },
              upsert: true,
            },
          })),
          { ordered: false }
        );

        await enrollmentAudit.insertMany(
          defaultCourses.map((course) => ({
            userId,
            courseId: course._id.toString(),
            action: 'assigned_by_admin',
            source: 'system',
            createdAt: now,
            metadata: {
              endpoint: '/api/auth/register',
              assignmentType: 'default_course_catalog',
              autoAssigned: true,
              courseTitle: typeof course.title === 'string' ? course.title : 'Training Course',
            },
          }))
        );
      }
    } catch {
      await rollbackNewUserArtifacts(db, userId);
      return NextResponse.json(
        { ok: false, message: 'Registration could not be completed. Please try again.' },
        { status: 503 }
      );
    }

    const session = await createSession(db, userId, request.headers.get('user-agent') || undefined);

    const response = NextResponse.json({
      ok: true,
      message: 'Registration successful. You can start default courses immediately while profile approval is pending.',
      user: {
        id: userId,
        fullName,
        email,
        role,
        department,
        phone: phone || '',
      },
      assignedDefaultCourseCount: defaultCourses.length,
      auth: {
        status: 'pending_approval',
        access: 'basic',
        message: 'Your account is active with immediate access to default courses. Full access will unlock after admin review.',
      },
    });

    applySessionCookie(response, session.token, session.expiresAt);
    return response;
  } catch (error) {
    const details = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      {
        ok: false,
        message: 'Failed to register user.',
        details: process.env.NODE_ENV === 'development' ? details : undefined,
      },
      { status: 500 }
    );
  }
}
