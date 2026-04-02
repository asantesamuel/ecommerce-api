import 'reflect-metadata';
import * as dotenv from 'dotenv';
dotenv.config();

// Ensure we are in test mode
process.env.NODE_ENV = 'test';

import { AppDataSource } from '../config/database';

beforeAll(async () => {
  // Wait to initialize the database
  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize();
  }
});

afterAll(async () => {
  if (AppDataSource.isInitialized) {
    await AppDataSource.destroy();
  }
});

afterEach(async () => {
  // Clear the database after each test to prevent test cross-contamination
  if (AppDataSource.isInitialized) {
    const entities = AppDataSource.entityMetadatas;
    for (const entity of entities) {
      const repository = AppDataSource.getRepository(entity.name);
      await repository.query(`TRUNCATE TABLE "${entity.tableName}" CASCADE;`);
    }
  }
});
