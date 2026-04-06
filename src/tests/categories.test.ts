import request from 'supertest';
import { app } from './testHelpers';
import { createAdminUser, createTestUser } from './testHelpers';

describe('Categories API Integration Tests', () => {
  let adminToken: string;
  let userToken: string;
  let categoryId: string;

  beforeAll(async () => {
    const admin = await createAdminUser('admin_cat@test.com', 'Pass123!');
    adminToken = admin.token;

    const user = await createTestUser('user_cat@test.com', 'Pass123!');
    userToken = user.token;
  });

  it('should allow admin to create a category', async () => {
    const res = await request(app)
      .post('/categories')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Electronics',
        slug: 'electronics-test'
      });
      
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body.name).toBe('Electronics');
    categoryId = res.body.id;
  });

  it('should prevent non-admins from creating categories', async () => {
    const res = await request(app)
      .post('/categories')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        name: 'Books',
        slug: 'books-test'
      });
      
    expect(res.status).toBe(403);
  });

  it('should fetch all categories publicly', async () => {
    const res = await request(app).get('/categories');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('should fetch a single category', async () => {
    const res = await request(app).get(`/categories/${categoryId}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(categoryId);
  });

  it('should update a category', async () => {
    const res = await request(app)
      .put(`/categories/${categoryId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Updated Electronics'
      });
      
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Updated Electronics');
  });

  it('should delete a category', async () => {
    const res = await request(app)
      .delete(`/categories/${categoryId}`)
      .set('Authorization', `Bearer ${adminToken}`);
      
    expect(res.status).toBe(204);

    const checkRes = await request(app).get(`/categories/${categoryId}`);
    expect(checkRes.status).toBe(404);
  });
});
