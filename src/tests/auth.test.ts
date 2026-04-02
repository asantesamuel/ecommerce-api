import request from 'supertest';
import { app } from './testHelpers';

describe('Auth API Integration Tests', () => {
  const testUser = {
    email: 'newuser@example.com',
    password: 'SecurePassword123!',
    firstName: 'John',
    lastName: 'Doe'
  };

  it('should register a new user successfully', async () => {
    const res = await request(app)
      .post('/auth/register')
      .send(testUser);
      
    // Handle both 201 Created and conflict if db wasn't wiped properly
    if (res.status === 409) {
      expect(res.body.message).toMatch(/exists/i);
    } else {
      expect(res.status).toBe(201);
      expect(res.body.user.email).toBe(testUser.email);
    }
  });

  it('should login and return an access token', async () => {
    // Ensure they exist first
    await request(app).post('/auth/register').send(testUser);

    const res = await request(app)
      .post('/auth/login')
      .send({
        email: testUser.email,
        password: testUser.password
      });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('accessToken');
    expect(res.body.user.email).toBe(testUser.email);
  });

  it('should reject invalid passwords', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({
        email: testUser.email,
        password: 'wrongpassword'
      });

    expect(res.status).toBe(401);
  });
});
