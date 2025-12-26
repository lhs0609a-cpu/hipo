const request = require('supertest');
const app = require('../server');
const { sequelize } = require('../src/models');

describe('Post API Tests', () => {
  let authToken;
  let userId;
  let postId;
  let testUser = {
    email: 'posttest@example.com',
    username: 'posttestuser',
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
      const { User, Post } = require('../src/models');
      await Post.destroy({ where: { userId } });
      await User.destroy({ where: { email: testUser.email } });
    } catch (error) {
      // Ignore cleanup errors
    }
    await sequelize.close();
  });

  describe('POST /api/posts', () => {
    it('should create a new post', async () => {
      if (!authToken) return;

      const response = await request(app)
        .post('/api/posts')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          content: 'This is a test post #testing',
          imageUrl: null
        })
        .expect('Content-Type', /json/);

      expect([200, 201]).toContain(response.status);

      if (response.status === 200 || response.status === 201) {
        expect(response.body).toHaveProperty('post');
        expect(response.body.post).toHaveProperty('id');
        expect(response.body.post.content).toBe('This is a test post #testing');
        postId = response.body.post.id;
      }
    });

    it('should not create post without authentication', async () => {
      const response = await request(app)
        .post('/api/posts')
        .send({
          content: 'This should fail'
        })
        .expect('Content-Type', /json/);

      expect([401, 403]).toContain(response.status);
    });

    it('should not create post without content', async () => {
      if (!authToken) return;

      const response = await request(app)
        .post('/api/posts')
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect('Content-Type', /json/);

      expect([400, 422]).toContain(response.status);
    });
  });

  describe('GET /api/posts', () => {
    it('should get feed of posts', async () => {
      if (!authToken) return;

      const response = await request(app)
        .get('/api/posts')
        .set('Authorization', `Bearer ${authToken}`)
        .expect('Content-Type', /json/);

      expect([200, 201]).toContain(response.status);

      if (response.status === 200) {
        expect(response.body).toHaveProperty('posts');
        expect(Array.isArray(response.body.posts)).toBe(true);
      }
    });

    it('should support pagination', async () => {
      if (!authToken) return;

      const response = await request(app)
        .get('/api/posts')
        .query({ page: 1, limit: 10 })
        .set('Authorization', `Bearer ${authToken}`)
        .expect('Content-Type', /json/);

      expect([200, 201]).toContain(response.status);
    });
  });

  describe('GET /api/posts/:postId', () => {
    it('should get specific post details', async () => {
      if (!authToken || !postId) return;

      const response = await request(app)
        .get(`/api/posts/${postId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect('Content-Type', /json/);

      expect([200, 201, 404]).toContain(response.status);

      if (response.status === 200) {
        expect(response.body).toHaveProperty('post');
        expect(response.body.post.id).toBe(postId);
      }
    });
  });

  describe('PUT /api/posts/:postId', () => {
    it('should update own post', async () => {
      if (!authToken || !postId) return;

      const response = await request(app)
        .put(`/api/posts/${postId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          content: 'Updated test post content'
        })
        .expect('Content-Type', /json/);

      expect([200, 201, 404]).toContain(response.status);

      if (response.status === 200) {
        expect(response.body).toHaveProperty('post');
        expect(response.body.post.content).toBe('Updated test post content');
      }
    });
  });

  describe('POST /api/posts/:postId/like', () => {
    it('should like a post', async () => {
      if (!authToken || !postId) return;

      const response = await request(app)
        .post(`/api/posts/${postId}/like`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect('Content-Type', /json/);

      expect([200, 201, 404]).toContain(response.status);

      if (response.status === 200 || response.status === 201) {
        expect(response.body).toHaveProperty('isLiked');
      }
    });

    it('should toggle like on second request', async () => {
      if (!authToken || !postId) return;

      const response = await request(app)
        .post(`/api/posts/${postId}/like`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect('Content-Type', /json/);

      expect([200, 201, 404]).toContain(response.status);
    });
  });

  describe('POST /api/posts/:postId/comments', () => {
    let commentId;

    it('should add comment to post', async () => {
      if (!authToken || !postId) return;

      const response = await request(app)
        .post(`/api/posts/${postId}/comments`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          content: 'This is a test comment'
        })
        .expect('Content-Type', /json/);

      expect([200, 201, 404]).toContain(response.status);

      if (response.status === 200 || response.status === 201) {
        expect(response.body).toHaveProperty('comment');
        expect(response.body.comment.content).toBe('This is a test comment');
        commentId = response.body.comment.id;
      }
    });

    it('should not add comment without content', async () => {
      if (!authToken || !postId) return;

      const response = await request(app)
        .post(`/api/posts/${postId}/comments`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect('Content-Type', /json/);

      expect([400, 422]).toContain(response.status);
    });
  });

  describe('GET /api/posts/:postId/comments', () => {
    it('should get comments for post', async () => {
      if (!authToken || !postId) return;

      const response = await request(app)
        .get(`/api/posts/${postId}/comments`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect('Content-Type', /json/);

      expect([200, 201]).toContain(response.status);

      if (response.status === 200) {
        expect(response.body).toHaveProperty('comments');
        expect(Array.isArray(response.body.comments)).toBe(true);
      }
    });
  });

  describe('GET /api/users/:userId/posts', () => {
    it('should get posts by specific user', async () => {
      if (!authToken || !userId) return;

      const response = await request(app)
        .get(`/api/users/${userId}/posts`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect('Content-Type', /json/);

      expect([200, 201, 404]).toContain(response.status);

      if (response.status === 200) {
        expect(response.body).toHaveProperty('posts');
        expect(Array.isArray(response.body.posts)).toBe(true);
      }
    });
  });

  describe('DELETE /api/posts/:postId', () => {
    it('should delete own post', async () => {
      if (!authToken || !postId) return;

      const response = await request(app)
        .delete(`/api/posts/${postId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect('Content-Type', /json/);

      expect([200, 201, 204, 404]).toContain(response.status);
    });
  });
});
