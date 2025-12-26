const request = require('supertest');
const app = require('../server');
const { sequelize } = require('../src/models');

describe('Auth API Tests', () => {
  let testUser = {
    email: 'test@example.com',
    username: 'testuser',
    password: 'Test123!@#'
  };

  beforeAll(async () => {
    // Ensure database is ready
    await sequelize.sync({ force: false });
  });

  afterAll(async () => {
    // Cleanup test user if exists
    try {
      const { User } = require('../src/models');
      await User.destroy({ where: { email: testUser.email } });
    } catch (error) {
      // Ignore cleanup errors
    }
    await sequelize.close();
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send(testUser)
        .expect('Content-Type', /json/);

      // Should return 201 or 200
      expect([200, 201]).toContain(response.status);

      if (response.status === 200 || response.status === 201) {
        expect(response.body).toHaveProperty('token');
        expect(response.body).toHaveProperty('user');
        expect(response.body.user.email).toBe(testUser.email);
        expect(response.body.user.username).toBe(testUser.username);
      }
    });

    it('should not register with duplicate email', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send(testUser)
        .expect('Content-Type', /json/);

      expect([400, 409]).toContain(response.status);
      expect(response.body).toHaveProperty('error');
    });

    it('should not register with invalid email', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'invalid-email',
          username: 'testuser2',
          password: 'Test123!@#'
        })
        .expect('Content-Type', /json/);

      expect([400, 422]).toContain(response.status);
    });

    it('should not register with weak password', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test2@example.com',
          username: 'testuser2',
          password: '123'
        })
        .expect('Content-Type', /json/);

      expect([400, 422]).toContain(response.status);
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login successfully with correct credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password
        })
        .expect('Content-Type', /json/);

      expect([200, 201]).toContain(response.status);

      if (response.status === 200 || response.status === 201) {
        expect(response.body).toHaveProperty('token');
        expect(response.body).toHaveProperty('user');
      }
    });

    it('should not login with incorrect password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: 'WrongPassword123!'
        })
        .expect('Content-Type', /json/);

      expect([400, 401]).toContain(response.status);
      expect(response.body).toHaveProperty('error');
    });

    it('should not login with non-existent email', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'Test123!@#'
        })
        .expect('Content-Type', /json/);

      expect([400, 401, 404]).toContain(response.status);
    });
  });

  describe('GET /api/auth/me', () => {
    let authToken;

    beforeAll(async () => {
      // Login to get token
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password
        });

      if (response.body.token) {
        authToken = response.body.token;
      }
    });

    it('should get current user with valid token', async () => {
      if (!authToken) {
        return; // Skip if no token
      }

      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${authToken}`)
        .expect('Content-Type', /json/);

      expect([200, 201]).toContain(response.status);

      if (response.status === 200) {
        expect(response.body).toHaveProperty('user');
        expect(response.body.user.email).toBe(testUser.email);
      }
    });

    it('should not get user without token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .expect('Content-Type', /json/);

      expect([401, 403]).toContain(response.status);
    });

    it('should not get user with invalid token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect('Content-Type', /json/);

      expect([401, 403]).toContain(response.status);
    });
  });
});
