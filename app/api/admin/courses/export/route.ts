import { NextResponse } from 'next/server';
import { COLLECTIONS } from '@/lib/db/collections';
import { requireAdmin } from '@/lib/auth/requireAdmin';

export async function GET(request: Request) {
  try {
    const admin = await requireAdmin(request);
    if (!admin.ok) {
      return admin.response;
    }

    const { db } = admin;

    const [courses, enrollmentStats] = await Promise.all([
      db.collection(COLLECTIONS.courses).find({ isDeleted: { $ne: true } }).sort({ createdAt: -1 }).toArray(),
      db
        .collection(COLLECTIONS.enrollments)
        .aggregate<{ _id: string; enrolled: number; completionRate: number }>([
          {
            $group: {
              _id: '$courseId',
              enrolled: { $sum: 1 },
              completionRate: { $avg: '$progressPct' },
            },
          },
        ])
        .toArray(),
    ]);

    const statMap = new Map<string, { enrolled: number; completionRate: number }>(
      enrollmentStats.map((entry) => [
        entry._id,
        {
          enrolled: entry.enrolled || 0,
          completionRate: Math.round(entry.completionRate || 0),
        },
      ])
    );

    // CSV Header
    const csvRows = [
      ['Title', 'Category', 'Level', 'Enrolled', 'Completion Rate (%)', 'Deadline', 'Status', 'Departments', 'Modules', 'Description', 'Video URLs', 'PDF URLs', 'Globally Assigned'].join(',')
    ];

    // CSV Data
    for (const course of courses) {
      const id = course._id.toString();
      const stats = statMap.get(id) || { enrolled: 0, completionRate: 0 };
      
      const title = typeof course.title === 'string' ? course.title.replace(/,/g, '') : 'Untitled Course';
      const category = typeof course.category === 'string' ? course.category.replace(/,/g, '') : 'General';
      const level = typeof course.level === 'string' ? course.level : 'Beginner';
      const enrolled = stats.enrolled;
      const completionRate = stats.completionRate;
      const deadline = course.deadline instanceof Date
        ? course.deadline.toISOString().slice(0, 10)
        : typeof course.deadline === 'string'
        ? course.deadline
        : 'N/A';
      const status = course.isPublished ? 'Active' : 'Inactive';
      const departments = Array.isArray(course.departments) ? course.departments.join('; ') : '';
      const modules = typeof course.modulesCount === 'number' ? course.modulesCount : 1;
      const description = typeof course.description === 'string' ? course.description.replace(/"/g, '""') : '';
      const videoUrls = Array.isArray(course.videoUrls) ? course.videoUrls.join('; ') : '';
      const pdfUrls = Array.isArray(course.pdfUrls) ? course.pdfUrls.join('; ') : '';
      const isGlobal = course.isDefaultForNewTrainees ? 'Yes' : 'No';

      csvRows.push([
        `"${title}"`,
        `"${category}"`,
        `"${level}"`,
        enrolled,
        completionRate,
        `"${deadline}"`,
        `"${status}"`,
        `"${departments}"`,
        modules,
        `"${description}"`,
        `"${videoUrls}"`,
        `"${pdfUrls}"`,
        `"${isGlobal}"`
      ].join(','));
    }

    const csvContent = csvRows.join('\n');

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="courses_export_${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  } catch (error) {
    const details = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { ok: false, message: 'Failed to export courses.', details: process.env.NODE_ENV === 'development' ? details : undefined },
      { status: 500 }
    );
  }
}
