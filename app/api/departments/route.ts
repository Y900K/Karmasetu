import { NextResponse } from 'next/server';
import { getMongoDb } from '@/lib/mongodb';
import { COLLECTIONS } from '@/lib/db/collections';

const DEFAULT_DEPARTMENTS = ["Safety & EHS", "Production", "Maintenance", "Quality Control", "Electrical", "Chemical / Process", "HR / Admin"];

export async function GET() {
  try {
    const db = await getMongoDb();
    const config = await db.collection(COLLECTIONS.systemConfig).findOne({ _id: 'departments' as any });
    
    if (config && config.departments) {
      return NextResponse.json({ ok: true, departments: config.departments });
    }
    
    return NextResponse.json({ ok: true, departments: DEFAULT_DEPARTMENTS });
  } catch (error) {
    return NextResponse.json({ ok: false, message: 'Failed to fetch departments.', error: (error as Error).message }, { status: 500 });
  }
}
