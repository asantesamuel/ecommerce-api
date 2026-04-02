import request from 'supertest';
import { app, createTestUser } from './testHelpers';
import * as paystack from '../config/paystack';

// Mock the Paystack config globally for this suite
jest.mock('../config/paystack', () => ({
  ...jest.requireActual('../config/paystack'),
  initializeTransaction: jest.fn(),
  verifyTransaction: jest.fn(),
}));

describe('Checkout API Integration Tests', () => {
  let token: string;

  beforeAll(async () => {
    const auth = await createTestUser('checkoutuser@test.com', 'Pass123!');
    token = auth.token;
  });

  it('should fail to checkout with an empty cart', async () => {
    const res = await request(app)
      .post('/orders/checkout')
      .set('Authorization', `Bearer ${token}`)
      .send({
        shippingAddress: {
          fullName: 'Jane Doe',
          addressLine1: '123 Test St',
          city: 'Accra',
          state: 'GR',
          postalCode: '00233',
          country: 'GH',
          phone: '+233241234567'
        },
        currency: 'GHS'
      });
      
    // Should gracefully fail with 400 since cart is empty
    expect(res.status).toBe(400); 
    expect(res.body.message).toMatch(/empty/i);
  });

  it('should process webhook verified charge successfully', async () => {
    // Set up mock return values for Paystack verification
    (paystack.verifyTransaction as jest.Mock).mockResolvedValue({
      status: true,
      data: {
        status: 'success',
        amount: 1500, // smallest unit match
      }
    });

    const payload = {
      event: 'charge.success',
      data: {
        reference: 'MOCK-REF-123',
        id: 999
      }
    };

    // Calculate valid HMAC signature for mock payload
    const crypto = require('crypto');
    const secret = process.env.PAYSTACK_SECRET_KEY || '';
    const hash = crypto
      .createHmac('sha512', secret)
      .update(JSON.stringify(payload))
      .digest('hex');

    const res = await request(app)
      .post('/payments/webhook')
      .set('x-paystack-signature', hash)
      .send(payload);
      
    // Verifying it completes gracefully now that signature validation passes
    expect(res.status).toBe(200);
  });
});
