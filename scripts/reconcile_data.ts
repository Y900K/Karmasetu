import { getMongoDb } from '../lib/mongodb';
import { COLLECTIONS } from '../lib/db/collections';

async function reconcile() {
  console.log('--- Starting Data Reconciliation ---');
  try {
    const db = await getMongoDb();
    const users = await db.collection(COLLECTIONS.users).find({ role: { $ne: 'admin' } }).toArray();
    console.log(`Found ${users.length} trainees to check.`);

    let updatedCount = 0;
    for (const user of users) {
      const userId = user._id.toString();
      const department = user.department || 'General';
      const fullName = user.fullName || 'Unknown Trainee';

      const result = await db.collection(COLLECTIONS.enrollments).updateMany(
        { userId: userId },
        { 
          $set: { 
            department: department,
            traineeName: fullName 
          } 
        }
      );
      
      if (result.modifiedCount > 0) {
        console.log(`Updated ${result.modifiedCount} enrollments for user ${fullName} (${department})`);
        updatedCount += result.modifiedCount;
      }
    }

    console.log(`--- Reconciliation Complete. Total enrollments updated: ${updatedCount} ---`);
    process.exit(0);
  } catch (err) {
    console.error('Reconciliation failed:', err);
    process.exit(1);
  }
}

reconcile();
