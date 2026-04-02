import request from 'supertest';
import { app } from './testHelpers';

describe('Products API Integration Tests', () => {
  it('should fetch a paginated list of products', async () => {
    const res = await request(app).get('/products');
    
    expect(res.status).toBe(200);
    // Based on typical TSOA pagination structure:
    expect(res.body).toHaveProperty('data');
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body).toHaveProperty('total');
  });

  it('should return 404 for an invalid product ID', async () => {
    const validUuidButNonExistent = '00000000-0000-0000-0000-000000000000';
    const res = await request(app).get(`/products/${validUuidButNonExistent}`);
    
    expect(res.status).toBe(404);
  });
});
