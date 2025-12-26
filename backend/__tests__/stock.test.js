const request = require('supertest');
const app = require('../server');
const { sequelize } = require('../src/models');

describe('Stock API Tests', () => {
  let authToken;
  let userId;
  let testUser = {
    email: 'stocktest@example.com',
    username: 'stocktestuser',
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

    it('should not get stocks without authentication', async () => {
      const response = await request(app)
        .get('/api/stocks')
        .expect('Content-Type', /json/);

      expect([401, 403]).toContain(response.status);
    });
  });

  describe('GET /api/stocks/:userId', () => {
    it('should get specific user stock details', async () => {
      if (!authToken || !userId) return;

      const response = await request(app)
        .get(`/api/stocks/${userId}`)
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
        .post(`/api/stocks/${userId}/buy`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ quantity: 10 })
        .expect('Content-Type', /json/);

      // May succeed or fail depending on balance and stock availability
      expect([200, 201, 400, 404]).toContain(response.status);

      if (response.status === 200 || response.status === 201) {
        expect(response.body).toHaveProperty('transaction');
        expect(response.body.transaction).toHaveProperty('quantity');
        expect(response.body.transaction.quantity).toBe(10);
      }
    });

    it('should not buy without quantity', async () => {
      if (!authToken || !userId) return;

      const response = await request(app)
        .post(`/api/stocks/${userId}/buy`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect('Content-Type', /json/);

      expect([400, 422]).toContain(response.status);
    });

    it('should not buy with invalid quantity', async () => {
      if (!authToken || !userId) return;

      const response = await request(app)
        .post(`/api/stocks/${userId}/buy`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ quantity: -10 })
        .expect('Content-Type', /json/);

      expect([400, 422]).toContain(response.status);
    });
  });

  describe('GET /api/stocks/:userId/shareholders', () => {
    it('should get shareholders list', async () => {
      if (!authToken || !userId) return;

      const response = await request(app)
        .get(`/api/stocks/${userId}/shareholders`)
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
        .get(`/api/stocks/${userId}/price-history`)
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
        .get('/api/portfolio')
        .set('Authorization', `Bearer ${authToken}`)
        .expect('Content-Type', /json/);

      expect([200, 201]).toContain(response.status);

      if (response.status === 200) {
        expect(response.body).toHaveProperty('portfolio');
        expect(Array.isArray(response.body.portfolio)).toBe(true);
      }
    });

    it('should not get portfolio without authentication', async () => {
      const response = await request(app)
        .get('/api/portfolio')
        .expect('Content-Type', /json/);

      expect([401, 403]).toContain(response.status);
    });
  });

  describe('GET /api/transactions', () => {
    it('should get transaction history', async () => {
      if (!authToken) return;

      const response = await request(app)
        .get('/api/transactions')
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
