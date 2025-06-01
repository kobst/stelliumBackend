// @ts-nocheck
import dotenv from 'dotenv';
import { initializeDatabase } from '../services/dbService.ts';
import { handleUserCreationUnknownTime, handleUserCreation } from '../controllers/astroDataController.ts';
import { handleBirthChartAnalysis } from '../controllers/gptController.ts';
import { handleCreateRelationship } from '../controllers/astroDataController.ts';
import { handleGetRelationshipScore, handleGenerateRelationshipAnalysis } from '../controllers/dbDataController.ts';

dotenv.config();

async function invokeHandler(handler, body) {
  return await new Promise((resolve, reject) => {
    const req = { body };
    let statusCode = 200;
    let jsonData = null;
    const res = {
      status(code) { statusCode = code; return this; },
      json(data) { jsonData = data; resolve({ statusCode, data: jsonData }); }
    } as any;
    Promise.resolve(handler(req, res)).catch(reject);
  });
}

async function runWorkflow() {
  await initializeDatabase();

  console.log('=== Creating User A (unknown time) ===');
  const userAInput = {
    firstName: 'Alex',
    lastName: 'Unknown',
    gender: 'nonbinary',
    placeOfBirth: 'Chicago, IL',
    dateOfBirth: '1990-04-15',
    email: 'alex.unknown@example.com',
    lat: '41.8781',
    lon: '-87.6298',
    tzone: '-6'
  };
  const { data: userAResp } = await invokeHandler(handleUserCreationUnknownTime, userAInput);
  const userA = userAResp.user;

  console.log('=== Generating Birth Chart Analysis for User A ===');
  await invokeHandler(handleBirthChartAnalysis, { user: userA });

  console.log('=== Creating User B (known time) ===');
  const userBInput = {
    firstName: 'Blair',
    lastName: 'Known',
    gender: 'female',
    placeOfBirth: 'Los Angeles, CA',
    dateOfBirth: '1985-09-12T08:30:00',
    time: '08:30',
    email: 'blair.known@example.com',
    lat: '34.0522',
    lon: '-118.2437',
    tzone: '-8'
  };
  const { data: userBResp } = await invokeHandler(handleUserCreation, userBInput);
  const userB = userBResp.user;

  console.log('=== Generating Birth Chart Analysis for User B ===');
  await invokeHandler(handleBirthChartAnalysis, { user: userB });

  console.log('=== Creating Relationship ===');
  const { data: relResp } = await invokeHandler(handleCreateRelationship, { userA, userB });
  const relationshipProfile = relResp.relationshipProfile;

  console.log('=== Scoring Relationship ===');
  const { data: scoreResp } = await invokeHandler(handleGetRelationshipScore, {
    synastryAspects: relationshipProfile.synastryAspects,
    compositeChart: relationshipProfile.compositeChart,
    userA,
    userB,
    compositeChartId: relationshipProfile._id
  });
  console.log('Relationship score saved with id:', scoreResp.saveResult?.insertedId);

  console.log('=== Generating Relationship Analysis ===');
  await invokeHandler(handleGenerateRelationshipAnalysis, { compositeChartId: relationshipProfile._id });

  console.log('=== Workflow Complete ===');
}

runWorkflow().catch(err => {
  console.error('Workflow failed:', err);
});
