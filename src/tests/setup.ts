import 'reflect-metadata';
import * as dotenv from 'dotenv';
dotenv.config();

// Ensure we are in test mode
process.env.NODE_ENV = 'test';

import { AppDataSource } from '../config/database';

jest.mock('ioredis', () => require('ioredis-mock'));

beforeAll(async () => {
  // Wait to initialize the database
  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize();
  }
  
  // Clear the database at the start of each test suite to prevent cross-contamination
  if (AppDataSource.isInitialized) {
    const entities = AppDataSource.entityMetadatas;
    for (const entity of entities) {
      const repository = AppDataSource.getRepository(entity.name);
      await repository.query(`TRUNCATE TABLE "${entity.tableName}" CASCADE;`);
    }
  }
});

afterAll(async () => {
  if (AppDataSource.isInitialized) {
    await AppDataSource.destroy();
  }
});
