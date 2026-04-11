import { NextResponse } from 'next/server';
import { getMongoDb, getMongoClient } from '@/lib/mongodb';
import { COLLECTIONS } from '@/lib/db/collections';
import { resolveSessionUser } from '@/lib/auth/session';

export async function POST(request: Request) {
  try {
    const db = await getMongoDb();
    const session = await resolveSessionUser(db, request);

    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ ok: false, message: 'Admin access denied.' }, { status: 403 });
    }

    const { department } = await request.json();

    if (!department || typeof department !== 'string' || !department.trim()) {
       return NextResponse.json({ ok: false, message: 'Invalid department name.' }, { status: 400 });
    }

    const deptName = department.trim();

    const configRef = db.collection(COLLECTIONS.systemConfig);
    const existing = await configRef.findOne({ _id: 'departments' as unknown });

    const departments: string[] = existing?.departments || ["Safety & EHS", "Production", "Maintenance", "Quality Control", "Electrical", "Chemical / Process", "HR / Admin"];

    if (departments.includes(deptName)) {
      return NextResponse.json({ ok: false, message: 'Department already exists.' }, { status: 400 });
    }

    departments.push(deptName);
    
    await configRef.updateOne(
      { _id: 'departments' as unknown },
      { $set: { departments, updatedAt: new Date() } },
      { upsert: true }
    );

    return NextResponse.json({ ok: true, departments });
  } catch (error) {
    return NextResponse.json({ ok: false, message: 'Failed to add department.', error: (error as Error).message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  let mongoSession = null;
  try {
    const client = await getMongoClient();
    const db = await getMongoDb();
    const session = await resolveSessionUser(db, request);

    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ ok: false, message: 'Admin access denied.' }, { status: 403 });
    }

    const { oldName, newName } = await request.json();

    if (!oldName || !newName || typeof newName !== 'string' || !newName.trim()) {
       return NextResponse.json({ ok: false, message: 'Invalid old or new department name.' }, { status: 400 });
    }

    const deptOldName = oldName.trim();
    const deptNewName = newName.trim();

    const configRef = db.collection(COLLECTIONS.systemConfig);
    const existing = await configRef.findOne({ _id: 'departments' as unknown });

    let departments: string[] = existing?.departments || ["Safety & EHS", "Production", "Maintenance", "Quality Control", "Electrical", "Chemical / Process", "HR / Admin"];

    if (!departments.includes(deptOldName)) {
      return NextResponse.json({ ok: false, message: 'Department does not exist.' }, { status: 404 });
    }

    if (departments.includes(deptNewName)) {
       return NextResponse.json({ ok: false, message: 'New department name already exists.' }, { status: 400 });
    }

    departments = departments.map(d => d === deptOldName ? deptNewName : d);

    mongoSession = client.startSession();
    mongoSession.startTransaction();

    await configRef.updateOne(
      { _id: 'departments' as unknown },
      { $set: { departments, updatedAt: new Date() } },
      { upsert: true, session: mongoSession }
    );

    // Update users safely
    await db.collection(COLLECTIONS.users).updateMany(
      { department: deptOldName },
      { $set: { department: deptNewName } },
      { session: mongoSession }
    );

    // Update courses that use this department
    await db.collection(COLLECTIONS.courses).updateMany(
      { departments: deptOldName },
      { $set: { "departments.$": deptNewName } },
      { session: mongoSession }
    );

    // Announcements
    await db.collection(COLLECTIONS.adminAnnouncements).updateMany(
      { sentTo: deptOldName },
      { $set: { "sentTo.$": deptNewName } },
      { session: mongoSession }
    );

    await mongoSession.commitTransaction();

    return NextResponse.json({ ok: true, departments });
  } catch (error) {
     if (mongoSession) {
       await mongoSession.abortTransaction().catch(() => {});
     }
     console.error('Department update error:', error);
     return NextResponse.json({ ok: false, message: 'Failed to update department due to transaction error.' }, { status: 500 });
  } finally {
     if (mongoSession) {
        await mongoSession.endSession().catch(() => {});
     }
  }
}

export async function DELETE(request: Request) {
  let mongoSession = null;
  try {
    const client = await getMongoClient();
    const db = await getMongoDb();
    const session = await resolveSessionUser(db, request);

    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ ok: false, message: 'Admin access denied.' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const departmentStr = searchParams.get('department');

    if (!departmentStr) {
       return NextResponse.json({ ok: false, message: 'Missing department name.' }, { status: 400 });
    }

    const deptName = decodeURIComponent(departmentStr);

    const configRef = db.collection(COLLECTIONS.systemConfig);
    const existing = await configRef.findOne({ _id: 'departments' as unknown });

    let departments: string[] = existing?.departments || ["Safety & EHS", "Production", "Maintenance", "Quality Control", "Electrical", "Chemical / Process", "HR / Admin"];

    departments = departments.filter(d => d !== deptName);

    mongoSession = client.startSession();
    mongoSession.startTransaction();

    await configRef.updateOne(
      { _id: 'departments' as unknown },
      { $set: { departments, updatedAt: new Date() } },
      { upsert: true, session: mongoSession }
    );

    // Update users safely to 'General' upon delete
    await db.collection(COLLECTIONS.users).updateMany(
      { department: deptName },
      { $set: { department: 'General' } },
      { session: mongoSession }
    );

    // Update courses by pulling the department
    await db.collection(COLLECTIONS.courses).updateMany(
      { departments: deptName },
      { $pull: { departments: deptName as unknown } },
      { session: mongoSession }
    );

    // Announcements
    await db.collection(COLLECTIONS.adminAnnouncements).updateMany(
      { sentTo: deptName },
      { $pull: { sentTo: deptName as unknown } },
      { session: mongoSession }
    );
    
    await mongoSession.commitTransaction();

    return NextResponse.json({ ok: true, departments });
  } catch (error) {
     if (mongoSession) {
         await mongoSession.abortTransaction().catch(() => {});
     }
     console.error('Department delete error:', error);
     return NextResponse.json({ ok: false, message: 'Failed to delete department due to transaction error.' }, { status: 500 });
  } finally {
     if (mongoSession) {
         await mongoSession.endSession().catch(() => {});
     }
  }
}
