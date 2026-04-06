import request from 'supertest';
import { app } from './testHelpers';
import { createTestUser } from './testHelpers';

describe.skip('Users API Integration Tests', () => {
  let userToken: string;

  beforeAll(async () => {
    const user = await createTestUser('user_profile@test.com', 'Pass123!');
    userToken = user.token;
  });

  it('should fetch own user profile', async () => {
    const res = await request(app)
      .get('/users/profile')
      .set('Authorization', `Bearer ${userToken}`);
      
    expect(res.status).toBe(200);
    expect(res.body.email).toBe('user_profile@test.com');
  });

  it('should update user profile', async () => {
    const res = await request(app)
      .patch('/users/profile')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        firstName: 'Jane',
        lastName: 'Smith'
      });
      
    expect(res.status).toBe(200);
    expect(res.body.firstName).toBe('Jane');
  });

  it('should update password and return success', async () => {
    const res = await request(app)
      .patch('/users/security/password')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        currentPassword: 'Pass123!',
        newPassword: 'NewPassword123!'
      });
      
    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/success/i);

    // Verify old password doesn't work
    const loginFail = await request(app)
      .post('/auth/login')
      .send({ email: 'user_profile@test.com', password: 'Pass123!' });
    expect(loginFail.status).toBe(401);

    // Verify new password works
    const loginSuccess = await request(app)
      .post('/auth/login')
      .send({ email: 'user_profile@test.com', password: 'NewPassword123!' });
    expect(loginSuccess.status).toBe(200);
  });
});
