#!/usr/bin/env npx ts-node --esm

/**
 * Migration script to move existing users collection data to subjects collection
 * Run with: npx ts-node --esm scripts/migrateUsersToSubjects.ts
 */

import { MongoClient, ObjectId } from 'mongodb';
import { getMongoConnectionString } from '../services/secretsService.js';

async function migrateUsersToSubjects() {
  let client: MongoClient | null = null;
  
  try {
    console.log('Starting migration from users to subjects collection...');
    
    // Get connection
    const connectionString = await getMongoConnectionString();
    client = new MongoClient(connectionString);
    await client.connect();
    
    const db = client.db('stellium');
    const usersCollection = db.collection('users');
    const subjectsCollection = db.collection('subjects');
    
    // Get all users
    const users = await usersCollection.find({}).toArray();
    console.log(`Found ${users.length} users to migrate`);
    
    if (users.length === 0) {
      console.log('No users found to migrate');
      return;
    }
    
    // Transform users to subjects format
    const subjects = users.map(user => ({
      ...user,
      kind: "accountSelf" as const,
      ownerUserId: null as ObjectId | null,
      isCelebrity: false,
      isReadOnly: false,
      createdAt: user.createdAt || new Date(),
      updatedAt: new Date()
    }));
    
    // Insert transformed data into subjects collection
    console.log('Inserting users into subjects collection...');
    const result = await subjectsCollection.insertMany(subjects, { ordered: false });
    console.log(`Successfully migrated ${result.insertedCount} users to subjects collection`);
    
    // Verify the migration
    const subjectCount = await subjectsCollection.countDocuments({
      $or: [{ kind: "accountSelf" }, { isCelebrity: false }]
    });
    console.log(`Total subjects with kind 'accountSelf' or isCelebrity false: ${subjectCount}`);
    
    console.log('Migration completed successfully!');
    
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  } finally {
    if (client) {
      await client.close();
    }
  }
}

// Run the migration
migrateUsersToSubjects()
  .then(() => {
    console.log('Migration script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration script failed:', error);
    process.exit(1);
  });