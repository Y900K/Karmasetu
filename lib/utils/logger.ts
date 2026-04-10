import { getMongoDb } from '@/lib/mongodb';
import { COLLECTIONS } from '@/lib/db/collections';

export type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'CRITICAL';

export interface SystemLog {
  level: LogLevel;
  source: string;
  message: string;
  metadata?: Record<string, unknown>;
  userId?: string;
  timestamp: Date;
}

export async function logSystemEvent(
  level: LogLevel,
  source: string,
  message: string,
  metadata?: Record<string, unknown>,
  userId?: string
) {
  try {
    const db = await getMongoDb();
    
    // We intentionally don't await this so it runs asynchronously in the background. 
    // This prevents error logging from slowing down user requests.
    const logPromise = db.collection(COLLECTIONS.systemLogs).insertOne({
      level,
      source,
      message,
      metadata: metadata ? JSON.parse(JSON.stringify(metadata, Object.getOwnPropertyNames(metadata))) : undefined, // Safely serialize Error objects
      userId,
      timestamp: new Date(),
    });

    if (process.env.NODE_ENV === 'development') {
      await logPromise;
      console.log(`[${level}] [${source}] ${message}`);
    }

  } catch (err) {
    console.error('Failed to write to system_logs. Console fallback:', err);
  }
}
