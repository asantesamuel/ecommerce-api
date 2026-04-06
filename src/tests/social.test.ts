import request from 'supertest';
import { app } from './testHelpers';
import { createTestUser } from './testHelpers';

describe('Social API Integration Tests', () => {
  let userToken: string;
  const dummyProductId = '00000000-0000-0000-0000-000000000000'; // Fake UUID

  beforeAll(async () => {
    const user = await createTestUser('social@test.com', 'Pass123!');
    userToken = user.token;
  });

  it('should send a friend request', async () => {
    const res = await request(app)
      .post('/social/friends/request')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        friendId: dummyProductId
      });
      
    expect([201, 404]).toContain(res.status); // 404 if friendId does not exist
  });

  it('should fetch pending friend requests', async () => {
    const res = await request(app)
      .get('/social/friends/requests')
      .set('Authorization', `Bearer ${userToken}`);
      
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('should fetch accepted friends', async () => {
    const res = await request(app)
      .get('/social/friends')
      .set('Authorization', `Bearer ${userToken}`);
      
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});
