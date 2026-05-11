import request from 'supertest';
import { app } from './testHelpers';
import { createAdminUser, createTestUser } from './testHelpers';

describe('Vendors API Integration Tests', () => {
  let vendorToken: string;
  let customerToken: string;
  let adminToken: string;

  beforeAll(async () => {
    const vendorRegister = await request(app)
      .post('/auth/register')
      .send({
        email: 'vendor1@test.com',
        password: 'Pass123!',
        firstName: 'Vendor',
        lastName: 'User',
        role: 'vendor',
        companyName: 'My Test Shop'
      });
    vendorToken = vendorRegister.body.accessToken;

    const customerUser = await createTestUser('customer1@test.com', 'Pass123!');
    customerToken = customerUser.token;

    const adminUser = await createAdminUser('vendor_admin@test.com', 'Pass123!');
    adminToken = adminUser.token;
  });

  it('should return the authenticated vendor profile', async () => {
    const res = await request(app)
      .get('/vendors/me')
      .set('Authorization', `Bearer ${vendorToken}`);

    expect(res.status).toBe(200);
    expect(res.body.companyName).toBe('My Test Shop');
    expect(res.body.status).toBe('pending_payment');
  });

  it('should prevent non-admins from viewing pending vendor applications', async () => {
    const res = await request(app)
      .get('/vendors/admin/pending')
      .set('Authorization', `Bearer ${customerToken}`);

    expect(res.status).toBe(403);
  });

  it('should allow admins to list pending vendor applications', async () => {
    const res = await request(app)
      .get('/vendors/admin/pending')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('data');
  });
});
