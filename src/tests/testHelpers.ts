import request from 'supertest';
import { createApp } from '../app';

export const app = createApp();

/**
 * Creates a valid test user through the API
 */
import { AppDataSource } from '../config/database';
import { User, UserRole } from '../entities/User';

export async function createTestUser(email = 'test@example.com', password = 'Password123!') {
  const registerResponse = await request(app)
    .post('/auth/register')
    .send({
      email,
      password,
      firstName: 'Test',
      lastName: 'User'
    });

  if (registerResponse.status !== 201 && registerResponse.status !== 200) {
    if (registerResponse.status === 409) {
      // already exists, proceed to login
    } else {
       console.warn('Register failed:', registerResponse.body);
    }
  }

  const loginResponse = await request(app)
    .post('/auth/login')
    .send({ email, password });

  return {
    token: loginResponse.body.accessToken,
    user: loginResponse.body.user,
  };
}

export async function createAdminUser(email = 'admin@example.com', password = 'AdminPassword123!') {
  await createTestUser(email, password);
  
  // Directly update the role properly via TypeORM ENUM
  await AppDataSource.getRepository(User).update(
    { email },
    { role: UserRole.ADMIN }
  );
  
  // Login again to get token with admin role payload
  const loginResponse = await request(app)
    .post('/auth/login')
    .send({ email, password });

  return {
    token: loginResponse.body.accessToken,
    user: loginResponse.body.user,
  };
}
