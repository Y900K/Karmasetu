import { NextResponse } from 'next/server';
import { getMongoDb } from '@/lib/mongodb';
import { COLLECTIONS } from '@/lib/db/collections';
import { resolveSessionUser } from '@/lib/auth/session';

type DistributionEntry = { hasOverdue: boolean; hasInProgress: boolean };
type AggregatedByCourse = { _id: string; total: number; completed: number; avgProgress: number };
type AggregatedByDept = { _id: string; total: number; completed: number; avgProgress: number };
type AggregatedOverall = { _id: null; total: number; completed: number; avgProgress: number };
type RawEnrollment = { userId?: string; courseId?: string; status?: string };
type EnrollmentFacet = {
  byCourse: AggregatedByCourse[];
  byDept: AggregatedByDept[];
  overall: AggregatedOverall[];
  rawStatusQuery: RawEnrollment[];
};

export async function GET(request: Request) {
  try {
    const db = await getMongoDb();
    const session = await resolveSessionUser(db, request);

    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ ok: false, message: 'Admin access denied.' }, { status: 403 });
    }

    // Aggregate Stats using narrow projections
    const [
      totalTrainees,
      activeCoursesCount,
      totalCertificates,
      totalCourses,
      activeCourses,
      allCourses,
      allTrainees,
      enrollmentAgg
    ] = await Promise.all([
      db.collection(COLLECTIONS.users).countDocuments({ role: { $ne: 'admin' } }),
      db.collection(COLLECTIONS.courses).countDocuments({ isPublished: true, isDeleted: { $ne: true } }),
      db.collection(COLLECTIONS.certificates).countDocuments({ status: { $ne: 'revoked' } }),
      db.collection(COLLECTIONS.courses).countDocuments({ isDeleted: { $ne: true } }),
      db.collection(COLLECTIONS.courses).find({ isPublished: true, isDeleted: { $ne: true } }).project({ _id: 1, title: 1, modulesCount: 1, deadline: 1 }).toArray(),
      // Keep all courses for overdue detection parity with users route
      db.collection(COLLECTIONS.courses).find({ isDeleted: { $ne: true } }).project({ _id: 1, title: 1, modulesCount: 1, deadline: 1 }).toArray(),
      db.collection(COLLECTIONS.users).find({ role: { $ne: 'admin' } }).project({ _id: 1, fullName: 1, isActive: 1, department: 1 }).toArray(),
      
      db.collection(COLLECTIONS.enrollments).aggregate<EnrollmentFacet>([
        {
          $addFields: {
            departmentNormalized: {
              $cond: {
                if: { $or: [{ $eq: ["$department", "Safety"] }, { $eq: ["$department", "safety"] }] },
                then: "Safety & EHS",
                else: { $ifNull: ["$department", "General"] }
              }
            }
          }
        },
        {
          $facet: {
            byCourse: [
              { $group: { _id: "$courseId", total: { $sum: 1 }, completed: { $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] } }, avgProgress: { $avg: "$progressPct" } } }
            ],
            byDept: [
              { 
                $group: { 
                  _id: "$departmentNormalized", 
                  total: { $sum: 1 }, 
                  completed: { $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] } },
                  avgProgress: { $avg: "$progressPct" }
                } 
              }
            ],
            overall: [
              { $group: { _id: null, total: { $sum: 1 }, completed: { $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] } }, avgProgress: { $avg: "$progressPct" } } }
            ],
            rawStatusQuery: [
               { $project: { userId: 1, courseId: 1, status: 1 } }
            ]
          }
        }
      ]).toArray()
    ]);

    const aggResult = enrollmentAgg[0] || { byCourse: [], byDept: [], overall: [], rawStatusQuery: [] };
    const rawEnrollments = aggResult.rawStatusQuery;

    const traineeEnrollmentMap = new Map<string, DistributionEntry>();
    const userNameMap = new Map<string, string>();
    const userDeptMap = new Map<string, string>();
    const activeCourseIdSet = new Set<string>();
    const courseMap = new Map<string, { title: string; deadlineMs?: number }>();
    const deptSet = new Set<string>(['General', 'Chemical', 'Maintenance', 'Safety & EHS']);
    const overdueRows: Array<{ userId: string; dept: string; course: string; daysOverdue: number }> = [];

    const now = new Date();
    const nowMs = now.getTime();

    for (const trainee of allTrainees) {
      const uid = trainee._id.toString();
      let dept = typeof trainee.department === 'string' && trainee.department.trim() ? trainee.department : 'General';
      if (dept.toLowerCase() === 'safety') dept = 'Safety & EHS';
      userDeptMap.set(uid, dept);
      userNameMap.set(uid, typeof trainee.fullName === 'string' && trainee.fullName.trim() ? trainee.fullName : 'Unknown Trainee');
      deptSet.add(dept);
    }

    for (const course of activeCourses) {
      const cid = typeof course._id === 'object' ? course._id.toString() : course._id;
      activeCourseIdSet.add(cid);
    }

    for (const course of allCourses) {
      const cid = typeof course._id === 'object' ? course._id.toString() : course._id;
      const title = typeof course.title === 'string' && course.title.trim() ? course.title : 'Untitled Course';
      if (course.deadline) {
        const deadlineMs = (course.deadline instanceof Date ? course.deadline : new Date(course.deadline)).getTime();
        courseMap.set(cid, { title, deadlineMs });
      } else {
        courseMap.set(cid, { title });
      }
    }

    for (const enrollment of rawEnrollments) {
      const uid = typeof enrollment.userId === 'string' ? enrollment.userId : '';
      if (!uid) continue;

      if (!traineeEnrollmentMap.has(uid)) {
        traineeEnrollmentMap.set(uid, { hasOverdue: false, hasInProgress: false });
      }

      const entry = traineeEnrollmentMap.get(uid);
      if (!entry) continue;

      const status = typeof enrollment.status === 'string' ? enrollment.status.toLowerCase() : '';
      const courseId = typeof enrollment.courseId === 'string' ? enrollment.courseId : '';
      
      if (status === 'in_progress') entry.hasInProgress = true;

      if (status !== 'completed') {
        const courseData = courseMap.get(courseId);
        if (courseData?.deadlineMs && courseData.deadlineMs < nowMs) {
          entry.hasOverdue = true;
          overdueRows.push({
            userId: uid,
            dept: userDeptMap.get(uid) || 'General',
            course: courseData?.title || 'Unknown Course',
            daysOverdue: Math.ceil((nowMs - courseData.deadlineMs) / (1000 * 60 * 60 * 24)),
          });
        }
      }
    }

    let activeCount = 0;
    let overdueCount = 0;
    let inactiveCount = 0;

    for (const trainee of allTrainees) {
      const uid = trainee._id.toString();
      const isActiveTrainee = trainee.isActive !== false;

      if (!isActiveTrainee) {
        inactiveCount++;
      } else {
        const enrollmentInfo = traineeEnrollmentMap.get(uid);
        if (enrollmentInfo?.hasOverdue) {
          overdueCount++;
        } else {
          activeCount++;
        }
      }
    }

    const overallStats = aggResult.overall[0] || { total: 0, completed: 0, avgProgress: 0 };
    const globalAvgProgress = Math.round(overallStats.avgProgress || 0);
    const complianceRate = overallStats.total > 0 
      ? Math.round((overallStats.completed / overallStats.total) * 100) 
      : 0;

    const completionByTitle = new Map<string, { completed: number; total: number }>();

    aggResult.byCourse.forEach((stats) => {
      const courseId = stats._id.toString();
      if (!activeCourseIdSet.has(courseId)) {
        return;
      }

      const courseData = courseMap.get(courseId);
      if (!courseData) {
        return;
      }

      const key = courseData.title;
      const existing = completionByTitle.get(key) || { completed: 0, total: 0 };
      existing.completed += stats.completed;
      existing.total += stats.total;
      completionByTitle.set(key, existing);
    });

    const completionRates = Array.from(completionByTitle.entries())
      .reduce<Array<{ name: string; value: number; enrollmentCount: number }>>((acc, [title, stats]) => {
        const enrollmentCount = stats.total;
        const rate = enrollmentCount > 0 ? Math.round((stats.completed / enrollmentCount) * 100) : 0;

        acc.push({
          name: title,
          value: rate,
          enrollmentCount,
        });
        return acc;
      }, [])
      .sort((a, b) => b.value - a.value)
      .slice(0, 12)
      .map(({ name, value }) => ({ name, value }));

    const overdueList = overdueRows
      .map((row) => ({
        name: userNameMap.get(row.userId) || 'Unknown Trainee',
        dept: row.dept,
        course: row.course,
        daysOverdue: row.daysOverdue,
      }))
      .sort((a, b) => b.daysOverdue - a.daysOverdue);

    // Build Dept Compliance with placeholders for missing depts
    const deptMap = new Map<string, { total: number; completed: number; avgProgress: number }>();
    deptSet.forEach(d => deptMap.set(d, { total: 0, completed: 0, avgProgress: 0 }));

    aggResult.byDept.forEach((stats) => {
      let name = stats._id;
      name = name === 'Unassigned' || !name ? 'General' : name;
      const current = deptMap.get(name) || { total: 0, completed: 0, avgProgress: 0 };
      deptMap.set(name, {
        total: current.total + stats.total,
        completed: current.completed + stats.completed,
        avgProgress: stats.avgProgress || 0
      });
    });

    const deptCompliance = Array.from(deptMap.entries()).map(([name, stats]) => ({
      name,
      compliance: Math.round(stats.avgProgress || 0),
      status: (stats.avgProgress || 0) >= 80 ? 'Compliant' : 'Warning'
    })).sort((a, b) => a.name.localeCompare(b.name));

    const avgModules = allCourses.length > 0 
      ? Math.round(allCourses.reduce((sum, c) => sum + (typeof c.modulesCount === 'number' ? c.modulesCount : 0), 0) / allCourses.length) 
      : 0;

    return NextResponse.json({
      ok: true,
      stats: {
        totalTrainees,
        activeCourses: activeCoursesCount,
        validCertificates: totalCertificates,
        compliance: `${complianceRate}%`,
        overdueTrainees: overdueCount,
        overdueList: overdueList.sort((a, b) => b.daysOverdue - a.daysOverdue),
        totalCourses,
        distribution: [
          { name: 'Active', value: activeCount, color: '#10b981' },
          { name: 'Overdue', value: overdueCount, color: '#ef4444' },
          { name: 'Inactive', value: inactiveCount, color: '#475569' },
        ],
        completionRates,
        deptCompliance,
        performanceInsights: [
          { value: `${complianceRate}%`, label: 'BINARY COMPLETION RATE', color: '#f59e0b' },
          { value: `${globalAvgProgress}%`, label: 'WORKFORCE AVG PROGRESS', color: '#06b6d4' },
          { value: `${avgModules}`, label: 'AVG MODULES/COURSE', color: '#f8fafc' },
          { value: `${totalTrainees > 0 ? Math.round((totalCertificates / totalTrainees) * 100) / 100 : 0}`, label: 'CERTIFICATES/TRAINEE', color: '#10b981' },
        ]
      }
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    const details = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      {
        ok: false,
        message: 'Failed to fetch admin stats',
        details: process.env.NODE_ENV === 'development' ? details : undefined,
      },
      { status: 500 }
    );
  }
}

