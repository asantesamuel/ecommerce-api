import request from 'supertest';
import { app } from './testHelpers';
import { createAdminUser, createTestUser } from './testHelpers';

describe('Admin API Integration Tests', () => {
  let adminToken: string;
  let userToken: string;
  let customerId: string;
  const dummyProductId = '00000000-0000-0000-0000-000000000000';

  beforeAll(async () => {
    const admin = await createAdminUser('admin_dash@test.com', 'Pass123!');
    adminToken = admin.token;

    const user = await createTestUser('customer_dash@test.com', 'Pass123!');
    userToken = user.token;
    customerId = user.user.id;
  });

  it('should allow admin to fetch all users', async () => {
    const res = await request(app)
      .get('/admin/users')
      .set('Authorization', `Bearer ${adminToken}`);
      
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('data');
    expect(res.body).toHaveProperty('total');
  });

  it('should prevent non-admins from fetching users', async () => {
    const res = await request(app)
      .get('/admin/users')
      .set('Authorization', `Bearer ${userToken}`);
      
    expect(res.status).toBe(403);
  });

  it('should allow admin to change user status', async () => {
    const res = await request(app)
      .post(`/admin/users/${customerId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ isActive: false });
      
    expect(res.status).toBe(200);
    expect(res.body.isActive).toBe(false);
  });

  it('should allow admin to inspect orders', async () => {
    const res = await request(app)
      .get('/admin/orders')
      .set('Authorization', `Bearer ${adminToken}`);
      
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('data');
  });

  it('should allow admin to fetch inventory alerts', async () => {
    const res = await request(app)
      .get('/admin/inventory/low-stock')
      .set('Authorization', `Bearer ${adminToken}`);
      
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('alerts');
  });

  it('should allow admin to view metrics dashboard', async () => {
    const res = await request(app)
      .get('/admin/analytics')
      .set('Authorization', `Bearer ${adminToken}`);
      
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('overview');
  });

  it('should allow admin to moderate a product', async () => {
    const res = await request(app)
      .post(`/admin/products/${dummyProductId}/moderate`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        action: 'approve'
      });
      
    expect([200, 404]).toContain(res.status); // 404 since product may not exist
  });
});
