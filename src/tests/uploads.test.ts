import request from 'supertest';
import { app } from './testHelpers';
import { createTestUser } from './testHelpers';

jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: jest.fn().mockResolvedValue('https://mock-valid-upload-url.com/file'),
}));
jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn().mockImplementation(() => ({})),
  PutObjectCommand: jest.fn().mockImplementation(() => ({})),
}));

describe('Uploads API Integration Tests', () => {
  let userToken: string;

  beforeAll(async () => {
    const user = await createTestUser('uploader@test.com', 'Pass123!');
    userToken = user.token;
  });

  it('should fetch a presigned URL', async () => {
    const res = await request(app)
      .post('/uploads/presign')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        filename: 'test-image.jpg',
        contentType: 'image/jpeg',
        fileSize: 1024,
        folder: 'products'
      });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('uploadUrl');
    expect(res.body).toHaveProperty('fileKey');
    expect(res.body).toHaveProperty('expiresIn');
  });

  it('should reject unauthorized upload requests', async () => {
    const res = await request(app)
      .post('/uploads/presign')
      .send({
        filename: 'test-image.jpg',
        contentType: 'image/jpeg',
        fileSize: 1024,
        folder: 'products'
      });
      
    expect(res.status).toBe(401);
  });
});
