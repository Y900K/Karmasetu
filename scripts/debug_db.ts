import { getMongoDb } from '../lib/mongodb';
import { COLLECTIONS } from '../lib/db/collections';

async function test() {
  try {
    const db = await getMongoDb();
    const allUsers = await db.collection(COLLECTIONS.users).find({}).toArray();
    const traineesCount = await db.collection(COLLECTIONS.users).countDocuments({ role: 'trainee' });
    
    console.log('Total Users:', allUsers.length);
    console.log('Trainees Count:', traineesCount);
    console.log('Roles Distributed:', allUsers.reduce((acc: Record<string, number>, u) => {
        acc[u.role] = (acc[u.role] || 0) + 1;
        return acc;
    }, {}));
  } catch (err) {
    console.error(err);
  }
}

test();
