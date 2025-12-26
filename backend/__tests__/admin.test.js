const request = require('supertest');
const app = require('../server');
const { sequelize } = require('../src/models');

describe('Admin API Tests', () => {
  let adminToken;
  let regularToken;
  let adminUser = {
    email: 'admin@example.com',
    username: 'adminuser',
    password: 'Admin123!@#'
  };
  let regularUser = {
    email: 'regular@example.com',
    username: 'regularuser',
    password: 'Regular123!@#'
  };

  beforeAll(async () => {
    await sequelize.sync({ force: false });

    // Create admin user
    const { User } = require('../src/models');

    // Register and set as admin
    const adminResponse = await request(app)
      .post('/api/auth/register')
      .send(adminUser);

    if (adminResponse.body.token) {
      adminToken = adminResponse.body.token;

      // Update user role to admin
      await User.update(
        { role: 'admin' },
        { where: { email: adminUser.email } }
      );
    }

    // Create regular user
    const regularResponse = await request(app)
      .post('/api/auth/register')
      .send(regularUser);

    if (regularResponse.body.token) {
      regularToken = regularResponse.body.token;
    }
  });

  afterAll(async () => {
    // Cleanup
    try {
      const { User } = require('../src/models');
      await User.destroy({ where: { email: adminUser.email } });
      await User.destroy({ where: { email: regularUser.email } });
    } catch (error) {
      // Ignore cleanup errors
    }
    await sequelize.close();
  });

  describe('GET /api/admin/stats/users', () => {
    it('should get user stats with admin token', async () => {
      if (!adminToken) return;

      const response = await request(app)
        .get('/api/admin/stats/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect('Content-Type', /json/);

      expect([200, 201]).toContain(response.status);

      if (response.status === 200) {
        expect(response.body).toHaveProperty('stats');
        expect(response.body.stats).toHaveProperty('totalUsers');
        expect(response.body.stats).toHaveProperty('todayUsers');
        expect(response.body.stats).toHaveProperty('weekUsers');
      }
    });

    it('should not get user stats without admin role', async () => {
      if (!regularToken) return;

      const response = await request(app)
        .get('/api/admin/stats/users')
        .set('Authorization', `Bearer ${regularToken}`)
        .expect('Content-Type', /json/);

      expect([401, 403]).toContain(response.status);
    });

    it('should not get user stats without token', async () => {
      const response = await request(app)
        .get('/api/admin/stats/users')
        .expect('Content-Type', /json/);

      expect([401, 403]).toContain(response.status);
    });
  });

  describe('GET /api/admin/stats/transactions', () => {
    it('should get transaction stats with admin token', async () => {
      if (!adminToken) return;

      const response = await request(app)
        .get('/api/admin/stats/transactions')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect('Content-Type', /json/);

      expect([200, 201]).toContain(response.status);

      if (response.status === 200) {
        expect(response.body).toHaveProperty('stats');
        expect(response.body.stats).toHaveProperty('today');
        expect(response.body.stats).toHaveProperty('week');
      }
    });
  });

  describe('GET /api/admin/stats/coins', () => {
    it('should get coin stats with admin token', async () => {
      if (!adminToken) return;

      const response = await request(app)
        .get('/api/admin/stats/coins')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect('Content-Type', /json/);

      expect([200, 201]).toContain(response.status);

      if (response.status === 200) {
        expect(response.body).toHaveProperty('stats');
        expect(response.body.stats).toHaveProperty('totalPO');
        expect(response.body.stats).toHaveProperty('today');
      }
    });
  });

  describe('GET /api/admin/system/status', () => {
    it('should get system status with admin token', async () => {
      if (!adminToken) return;

      const response = await request(app)
        .get('/api/admin/system/status')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect('Content-Type', /json/);

      expect([200, 201]).toContain(response.status);

      if (response.status === 200) {
        expect(response.body).toHaveProperty('status');
        expect(response.body.status).toHaveProperty('server');
        expect(response.body.status).toHaveProperty('database');
        expect(response.body.status).toHaveProperty('uptime');
        expect(response.body.status).toHaveProperty('memory');
      }
    });
  });

  describe('GET /api/admin/charts/user-growth', () => {
    it('should get user growth chart data', async () => {
      if (!adminToken) return;

      const response = await request(app)
        .get('/api/admin/charts/user-growth')
        .query({ days: 30 })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect('Content-Type', /json/);

      expect([200, 201]).toContain(response.status);

      if (response.status === 200) {
        expect(response.body).toHaveProperty('data');
        expect(Array.isArray(response.body.data)).toBe(true);
      }
    });
  });

  describe('GET /api/admin/charts/transaction-volume', () => {
    it('should get transaction volume chart data', async () => {
      if (!adminToken) return;

      const response = await request(app)
        .get('/api/admin/charts/transaction-volume')
        .query({ days: 30 })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect('Content-Type', /json/);

      expect([200, 201]).toContain(response.status);

      if (response.status === 200) {
        expect(response.body).toHaveProperty('data');
        expect(Array.isArray(response.body.data)).toBe(true);
      }
    });
  });

  describe('GET /api/admin/charts/coin-flow', () => {
    it('should get coin flow chart data', async () => {
      if (!adminToken) return;

      const response = await request(app)
        .get('/api/admin/charts/coin-flow')
        .query({ days: 30 })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect('Content-Type', /json/);

      expect([200, 201]).toContain(response.status);

      if (response.status === 200) {
        expect(response.body).toHaveProperty('data');
        expect(Array.isArray(response.body.data)).toBe(true);
      }
    });
  });

  describe('GET /api/admin/charts/active-users', () => {
    it('should get active users chart data', async () => {
      if (!adminToken) return;

      const response = await request(app)
        .get('/api/admin/charts/active-users')
        .query({ days: 30 })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect('Content-Type', /json/);

      expect([200, 201]).toContain(response.status);

      if (response.status === 200) {
        expect(response.body).toHaveProperty('data');
        expect(Array.isArray(response.body.data)).toBe(true);
      }
    });
  });

  describe('GET /api/admin/suspicious-accounts', () => {
    it('should get suspicious accounts list', async () => {
      if (!adminToken) return;

      const response = await request(app)
        .get('/api/admin/suspicious-accounts')
        .query({ page: 1, limit: 20, minScore: 50 })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect('Content-Type', /json/);

      expect([200, 201]).toContain(response.status);

      if (response.status === 200) {
        expect(response.body).toHaveProperty('users');
        expect(response.body).toHaveProperty('total');
        expect(Array.isArray(response.body.users)).toBe(true);
      }
    });
  });
});
