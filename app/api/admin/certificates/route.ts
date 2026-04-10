import { NextResponse } from 'next/server';
import { COLLECTIONS } from '@/lib/db/collections';
import { requireAdmin } from '@/lib/auth/requireAdmin';

type CertificateRow = {
  certNo: string;
  trainee: string;
  course: string;
  issueDate: string;
  expiry: string;
  score: number;
  status: 'Valid' | 'Expired' | 'Revoked';
};

function formatDate(value: unknown): string {
  if (!(value instanceof Date)) {
    return 'NA';
  }

  return value.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function normalizeStatus(status: unknown, expiresAt: unknown): 'Valid' | 'Expired' | 'Revoked' {
  if (status === 'revoked') {
    return 'Revoked';
  }

  if (expiresAt instanceof Date && expiresAt.getTime() < Date.now()) {
    return 'Expired';
  }

  return 'Valid';
}

type AggregatedCertificate = {
  certNo?: string;
  trainee?: string;
  course?: string;
  issuedAt?: Date;
  expiresAt?: Date;
  score?: number;
  status?: string;
};

export async function GET(request: Request) {
  try {
    const admin = await requireAdmin(request);
    if (!admin.ok) {
      return admin.response;
    }

    const { db } = admin;
    
    // Optimized Aggregation Pipeline with $lookup
    const certificates = await db.collection(COLLECTIONS.certificates).aggregate<AggregatedCertificate>([
      { $sort: { issuedAt: -1 } },
      {
        $addFields: {
          userObjId: { $convert: { input: "$userId", to: "objectId", onError: null, onNull: null } },
          courseObjId: { $convert: { input: "$courseId", to: "objectId", onError: null, onNull: null } }
        }
      },
      {
        $lookup: {
          from: COLLECTIONS.users,
          localField: "userObjId",
          foreignField: "_id",
          as: "userDetails"
        }
      },
      {
        $lookup: {
          from: COLLECTIONS.courses,
          localField: "courseObjId",
          foreignField: "_id",
          as: "courseDetails"
        }
      },
      {
        $project: {
          certNo: 1,
          issuedAt: 1,
          expiresAt: 1,
          score: 1,
          status: 1,
          trainee: { $arrayElemAt: ["$userDetails.fullName", 0] },
          course: { $arrayElemAt: ["$courseDetails.title", 0] }
        }
      }
    ]).toArray();

    const rows: CertificateRow[] = certificates.map((cert) => ({
      certNo: cert.certNo || 'NA',
      trainee: cert.trainee || 'Trainee User',
      course: cert.course || 'Industrial Training Course',
      issueDate: formatDate(cert.issuedAt),
      expiry: formatDate(cert.expiresAt),
      score: cert.score || 0,
      status: normalizeStatus(cert.status, cert.expiresAt),
    }));

    return NextResponse.json({ ok: true, certificates: rows });
  } catch (error) {
    const details = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      {
        ok: false,
        message: 'Failed to load certificates.',
        details: process.env.NODE_ENV === 'development' ? details : undefined,
      },
      { status: 500 }
    );
  }
}
