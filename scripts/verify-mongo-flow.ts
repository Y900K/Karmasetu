import { MongoClient } from 'mongodb';
import 'dotenv/config';

const uri = process.env.MONGODB_URI;

async function run() {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db('Karma');
    
    // Find the most recently created course
    const latestCourse = await db.collection('courses').find().sort({ createdAt: -1 }).limit(1).toArray();
    
    if (latestCourse.length === 0) {
      console.log('No courses found in the database.');
      return;
    }

    const course = latestCourse[0];
    console.log(`\n=== Most Recent Course Verification ===\n`);
    console.log(`Title: ${course.title}`);
    console.log(`Code: ${course.code}`);
    console.log(`Status / isPublished: ${course.isPublished ? 'Yes (Active)' : 'No (Inactive)'}`);
    
    console.log(`\n--- Thumbnail Data ---`);
    console.log(`Thumbnail URL: ${course.thumbnail}`);
    if (course.thumbnailMeta) {
      console.log(`Provider: ${course.thumbnailMeta.provider}`);
      console.log(`Source URL: ${course.thumbnailMeta.sourceUrl}`);
      console.log(`Imported At: ${course.thumbnailMeta.importedAt}`);
    } else {
      console.log(`Thumbnail Meta: Missing`);
    }

    console.log(`\n--- Quiz Data ---`);
    const quizQuestions = course.quiz?.questions || [];
    console.log(`Questions Count: ${quizQuestions.length}`);
    if (quizQuestions.length > 0) {
      console.log(`Sample Question 1: ${quizQuestions[0].text}`);
      console.log(`Sample Options: ${quizQuestions[0].options.join(' | ')}`);
    }

    console.log(`\n=======================================\n`);
    
  } finally {
    await client.close();
  }
}

run().catch(console.error);
