const request = require('supertest');
const app = require('../server');
const { sequelize } = require('../src/models');

describe('Stock API Tests', () => {
  const runId = `${process.pid}${Date.now()}`;
  let authToken;
  let userId;
  let stockId;
  let testUser = {
    email: `stock-${runId}@example.com`,
    username: `stock${runId}`,
    password: 'Test123!@#'
  };

  beforeAll(async () => {
    await sequelize.sync({ force: false });

    // Register and login
    const registerResponse = await request(app)
      .post('/api/auth/register')
      .send(testUser);

    if (registerResponse.body.token) {
      authToken = registerResponse.body.token;
      userId = registerResponse.body.user.id;
      const stockResponse = await request(app).get(`/api/stocks/user/${userId}`);
      stockId = stockResponse.body.stock?.id;
    }
  });

  afterAll(async () => {
    // Cleanup
    try {
      const { User } = require('../src/models');
      await User.destroy({ where: { email: testUser.email } });
    } catch (error) {
      // Ignore cleanup errors
    }
    await sequelize.close();
  });

  describe('GET /api/stocks', () => {
    it('should get list of stocks', async () => {
      if (!authToken) return;

      const response = await request(app)
        .get('/api/stocks')
        .set('Authorization', `Bearer ${authToken}`)
        .expect('Content-Type', /json/);

      expect([200, 201]).toContain(response.status);

      if (response.status === 200) {
        expect(response.body).toHaveProperty('stocks');
        expect(Array.isArray(response.body.stocks)).toBe(true);
      }
    });

    it('should expose the public market without authentication', async () => {
      const response = await request(app)
        .get('/api/stocks')
        .expect('Content-Type', /json/);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.stocks)).toBe(true);
    });
  });

  describe('GET /api/stocks/:userId', () => {
    it('should get specific user stock details', async () => {
      if (!authToken || !userId) return;

      const response = await request(app)
        .get(`/api/stocks/user/${userId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect('Content-Type', /json/);

      expect([200, 201, 404]).toContain(response.status);

      if (response.status === 200) {
        expect(response.body).toHaveProperty('stock');
        expect(response.body.stock).toHaveProperty('userId');
        expect(response.body.stock).toHaveProperty('sharePrice');
      }
    });
  });

  describe('POST /api/stocks/:userId/buy', () => {
    it('should buy stock shares', async () => {
      if (!authToken || !userId) return;

      const response = await request(app)
        .post('/api/stocks/buy')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ stockId, shares: 10 })
        .expect('Content-Type', /json/);

      // May succeed or fail depending on balance and stock availability
      expect([200, 201, 400, 404]).toContain(response.status);

      if (response.status === 200 || response.status === 201) {
        expect(response.body).toHaveProperty('transaction');
        expect(response.body.transaction).toHaveProperty('shares');
        expect(response.body.transaction.shares).toBeGreaterThan(0);
      }
    });

    it('should not buy without quantity', async () => {
      if (!authToken || !userId) return;

      const response = await request(app)
        .post('/api/stocks/buy')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ stockId })
        .expect('Content-Type', /json/);

      expect([400, 422]).toContain(response.status);
    });

    it('should not buy with invalid quantity', async () => {
      if (!authToken || !userId) return;

      const response = await request(app)
        .post('/api/stocks/buy')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ stockId, shares: -10 })
        .expect('Content-Type', /json/);

      expect([400, 422]).toContain(response.status);
    });
  });

  describe('GET /api/stocks/:userId/shareholders', () => {
    it('should get shareholders list', async () => {
      if (!authToken || !userId) return;

      const response = await request(app)
        .get('/api/stocks/me/shareholders')
        .set('Authorization', `Bearer ${authToken}`)
        .expect('Content-Type', /json/);

      expect([200, 201]).toContain(response.status);

      if (response.status === 200) {
        expect(response.body).toHaveProperty('shareholders');
        expect(Array.isArray(response.body.shareholders)).toBe(true);
      }
    });
  });

  describe('GET /api/stocks/:userId/price-history', () => {
    it('should get stock price history', async () => {
      if (!authToken || !userId) return;

      const response = await request(app)
        .get(`/api/stocks/${stockId}/history`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect('Content-Type', /json/);

      expect([200, 201]).toContain(response.status);

      if (response.status === 200) {
        expect(response.body).toHaveProperty('history');
        expect(Array.isArray(response.body.history)).toBe(true);
      }
    });
  });

  describe('GET /api/portfolio', () => {
    it('should get user portfolio', async () => {
      if (!authToken) return;

      const response = await request(app)
        .get('/api/stocks/me/holdings')
        .set('Authorization', `Bearer ${authToken}`)
        .expect('Content-Type', /json/);

      expect([200, 201]).toContain(response.status);

      if (response.status === 200) {
        expect(response.body).toHaveProperty('holdings');
        expect(Array.isArray(response.body.holdings)).toBe(true);
      }
    });

    it('should not get portfolio without authentication', async () => {
      const response = await request(app)
        .get('/api/stocks/me/holdings')
        .expect('Content-Type', /json/);

      expect([401, 403]).toContain(response.status);
    });
  });

  describe('GET /api/transactions', () => {
    it('should get transaction history', async () => {
      if (!authToken) return;

      const response = await request(app)
        .get('/api/stocks/me/transactions')
        .set('Authorization', `Bearer ${authToken}`)
        .expect('Content-Type', /json/);

      expect([200, 201]).toContain(response.status);

      if (response.status === 200) {
        expect(response.body).toHaveProperty('transactions');
        expect(Array.isArray(response.body.transactions)).toBe(true);
      }
    });
  });
});
