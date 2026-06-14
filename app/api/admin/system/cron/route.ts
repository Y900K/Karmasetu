import { NextResponse } from 'next/server';
import { getMongoDb } from '@/lib/mongodb';
import { logSystemEvent } from '@/lib/utils/logger';

export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    await logSystemEvent('CRITICAL', 'cron_uptime_monitor', 'CRON_SECRET is not configured in environment variables.');
    return NextResponse.json({ error: 'Cron secret is not configured' }, { status: 500 });
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const startTime = Date.now();
  let dbHealthy = false;
  
  // 1. Health Checks
  try {
    const db = await getMongoDb();
    await db.command({ ping: 1 });
    dbHealthy = true;
  } catch (err) {
    // Highly critical, database is unresponsive
    await logSystemEvent('CRITICAL', 'cron_uptime_monitor', 'MongoDB connection failed during cron check!', { error: err });
    return NextResponse.json({ status: 'db_down' }, { status: 500 });
  }

  // 2. Auto-Fixing: Purge orphaned/stuck configurations or clear out resolved CB statuses
  try {
    const db = await getMongoDb();
    
    // Clear out half-open statuses if they've been stuck for too long (1 hour)
    const stuckThreshold = new Date(Date.now() - 60 * 60 * 1000);
    await db.collection('system_config').updateMany(
      { status: 'half_open', updatedAt: { $lt: stuckThreshold } },
      { $set: { status: 'closed', fails: 0 } }
    );

  } catch (err) {
    await logSystemEvent('WARN', 'cron_cleanup', 'Failed to run DB cleanup tasks', { error: err });
  }

  const elapsedMs = Date.now() - startTime;
  await logSystemEvent('INFO', 'cron_uptime_monitor', `Routine system check completed in ${elapsedMs}ms.`);

  return NextResponse.json({ 
    ok: true, 
    uptime: '100%', 
    dbHealthy,
    elapsedMs 
  });
}
