import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
dotenv.config();

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.NODE_ENV === 'test' 
    ? process.env.DATABASE_URL_TEST 
    : process.env.DATABASE_URL,
  entities: [__dirname + '/../entities/*.{ts,js}'],
  migrations: [__dirname + '/../migrations/*.{ts,js}'],
  synchronize: process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'development', // Sync automatically during tests and dev
  logging: process.env.NODE_ENV === 'development',
});