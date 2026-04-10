import { getMongoDb } from '@/lib/mongodb';
import { COLLECTIONS } from '@/lib/db/collections';
import { logSystemEvent } from '@/lib/utils/logger';

const CB_CONFIG_KEY = 'sarvam_ai_circuit_breaker';
const MAX_FAILS = 3;
const BREAK_DURATION_MS = 60 * 1000; // 1 minute (60,000ms) for fast auto-recovery

export async function checkCircuitBreaker(): Promise<{ isBroken: boolean; fallbackReason?: string }> {
  try {
    const db = await getMongoDb();
    const config = await db.collection(COLLECTIONS.systemConfig).findOne({ key: CB_CONFIG_KEY });
    
    if (config && config.status === 'open') {
      const now = new Date();
      if (now < new Date(config.expiresAt)) {
        // Still broken
        return { isBroken: true, fallbackReason: `Sarvam AI Circuit Breaker is active. AI offline until ${config.expiresAt}` };
      } else {
        // Time expired, let's half-open and try again
        await db.collection(COLLECTIONS.systemConfig).updateOne(
          { key: CB_CONFIG_KEY },
          { $set: { status: 'half_open', updatedAt: new Date() } }
        );
        return { isBroken: false };
      }
    }
    return { isBroken: false };
  } catch (err) {
    console.error('CB read error', err);
    return { isBroken: false }; // Fail open
  }
}

export async function recordCircuitBreakerSuccess() {
  try {
    const db = await getMongoDb();
    await db.collection(COLLECTIONS.systemConfig).updateOne(
      { key: CB_CONFIG_KEY },
      { $set: { fails: 0, status: 'closed', updatedAt: new Date() } },
      { upsert: true }
    );
  } catch (err) {
    // ignore
  }
}

export async function recordCircuitBreakerFailure(errorMessage: string) {
  try {
    const db = await getMongoDb();
    const config = await db.collection(COLLECTIONS.systemConfig).findOne({ key: CB_CONFIG_KEY });
    
    const fails = (config?.fails || 0) + 1;
    
    if (fails >= MAX_FAILS) {
      const expiresAt = new Date(Date.now() + BREAK_DURATION_MS);
      await db.collection(COLLECTIONS.systemConfig).updateOne(
        { key: CB_CONFIG_KEY },
        { 
          $set: { 
            status: 'open', 
            fails, 
            expiresAt, 
            updatedAt: new Date() 
          } 
        },
        { upsert: true }
      );
      
      // Auto-log to our new In-House system logs!
      await logSystemEvent(
        'CRITICAL',
        'sarvam_ai',
        `AI Circuit Breaker Tripped! AI will be disabled for 1 minute due to ${fails} consecutive failures.`,
        { error: errorMessage }
      );
    } else {
      await db.collection(COLLECTIONS.systemConfig).updateOne(
        { key: CB_CONFIG_KEY },
        { $set: { fails, status: 'closed', updatedAt: new Date() } },
        { upsert: true }
      );
    }
  } catch (err) {
    console.error('CB write error', err);
  }
}
