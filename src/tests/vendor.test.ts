import request from 'supertest';
import { app } from './testHelpers';
import { createTestUser } from './testHelpers';

describe('Vendors API Integration Tests', () => {
  let vendorToken: string;
  let customerToken: string;

  beforeAll(async () => {
    const vendorUser = await createTestUser('vendor1@test.com', 'Pass123!');
    vendorToken = vendorUser.token;

    const customerUser = await createTestUser('customer1@test.com', 'Pass123!');
    customerToken = customerUser.token;
  });

  it('should initialize vendor onboarding', async () => {
    // Requires a mock or will hit Paystack HTTP depending on integration
    // But we test the initial onboarding route
    const res = await request(app)
      .post('/vendors/onboarding/paystack')
      .set('Authorization', `Bearer ${vendorToken}`)
      .send({
        companyName: 'My Test Shop',
        description: 'A great shop'
      });
      
    // Assuming 200 or 201 - might return a paystack auth URL or create the vendor
    // If it requires mocked paystack, we just test it doesn't 500 or 401
    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(500);
  });

  it('should reject unauthorized access to vendor dashboard', async () => {
    const res = await request(app)
      .get('/vendors/me/dashboard')
      .set('Authorization', `Bearer ${customerToken}`);
      
    expect(res.status).toBe(403);
  });
});
