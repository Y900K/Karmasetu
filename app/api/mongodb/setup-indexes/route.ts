import { NextResponse } from 'next/server';
import { ensureMongoIndexes } from '@/lib/db/setupIndexes';
import { getMongoDb } from '@/lib/mongodb';

export async function POST(request: Request) {
  try {
    const setupKey = process.env.MONGODB_SETUP_KEY;

    if (!setupKey) {
      return NextResponse.json(
        { ok: false, message: 'MONGODB_SETUP_KEY is not configured.' },
        { status: 500 }
      );
    }

    const requestKey = request.headers.get('x-setup-key');
    if (requestKey !== setupKey) {
      return NextResponse.json(
        { ok: false, message: 'Unauthorized.' },
        { status: 401 }
      );
    }

    const db = await getMongoDb();
    await ensureMongoIndexes(db);
    return NextResponse.json({ ok: true, message: 'MongoDB indexes ensured.' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    const details = process.env.NODE_ENV === 'development' ? message : undefined;

    return NextResponse.json(
      { ok: false, message: 'Failed to setup MongoDB indexes.', details },
      { status: 500 }
    );
  }
}
