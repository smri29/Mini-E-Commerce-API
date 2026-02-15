// tests/integration/api.test.js
const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryReplSet } = require('mongodb-memory-server');

let replset;
let app;

const Product = require('../../src/models/Product');
const User = require('../../src/models/User');

async function clearDatabase() {
  if (!mongoose.connection?.db) return;
  const collections = await mongoose.connection.db.collections();
  for (const collection of collections) {
    await collection.deleteMany({});
  }
}

async function registerUser({ name, email, password, role, adminKeyHeader }) {
  const req = request(app).post('/api/auth/register').send({
    name,
    email,
    password,
    ...(role ? { role } : {})
  });

  if (adminKeyHeader) {
    req.set('x-admin-signup-key', adminKeyHeader);
  }

  return req;
}

async function loginUser({ email, password }) {
  return request(app).post('/api/auth/login').send({ email, password });
}

beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_jwt_secret_123';
  process.env.JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '30d';
  process.env.ADMIN_SIGNUP_KEY = process.env.ADMIN_SIGNUP_KEY || 'test_admin_key_123';
  process.env.CORS_ORIGIN = '*';

  replset = await MongoMemoryReplSet.create({
    replSet: { count: 1 }
  });

  const uri = replset.getUri();
  await mongoose.connect(uri, { dbName: 'mini-ecom-test' });

  app = require('../../src/app');
});

afterEach(async () => {
  await clearDatabase();
});

afterAll(async () => {
  await mongoose.disconnect();
  if (replset) await replset.stop();
});

describe('Mini E-Commerce API - Integration Tests', () => {
  test('1) Auth: register + login returns JWT and user (no password exposed)', async () => {
    const regRes = await registerUser({
      name: 'John Doe',
      email: 'john@example.com',
      password: 'password123'
    });

    expect(regRes.statusCode).toBe(201);
    expect(regRes.body).toHaveProperty('token');
    expect(regRes.body.data).toHaveProperty('user');
    expect(regRes.body.data.user.email).toBe('john@example.com');
    expect(regRes.body.data.user).not.toHaveProperty('password');

    const loginRes = await loginUser({
      email: 'john@example.com',
      password: 'password123'
    });

    expect(loginRes.statusCode).toBe(200);
    expect(loginRes.body).toHaveProperty('token');
    expect(loginRes.body.data.user.email).toBe('john@example.com');
    expect(loginRes.body.data.user).not.toHaveProperty('password');
  });

  test('2) Auth hardening: admin signup is blocked without admin key', async () => {
    const res = await registerUser({
      name: 'Admin User',
      email: 'admin-no-key@example.com',
      password: 'password123',
      role: 'admin'
    });

    expect(res.statusCode).toBe(403);
    expect(res.body.message).toMatch(/admin/i);
  });

  test('3) RBAC: admin can create product; customer cannot', async () => {
    const adminReg = await registerUser({
      name: 'Admin',
      email: 'admin@example.com',
      password: 'password123',
      role: 'admin',
      adminKeyHeader: process.env.ADMIN_SIGNUP_KEY
    });
    expect(adminReg.statusCode).toBe(201);

    const adminLogin = await loginUser({
      email: 'admin@example.com',
      password: 'password123'
    });
    expect(adminLogin.statusCode).toBe(200);
    const adminToken = adminLogin.body.token;

    const userReg = await registerUser({
      name: 'User',
      email: 'user@example.com',
      password: 'password123'
    });
    expect(userReg.statusCode).toBe(201);

    const userLogin = await loginUser({
      email: 'user@example.com',
      password: 'password123'
    });
    expect(userLogin.statusCode).toBe(200);
    const userToken = userLogin.body.token;

    const createProd = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Laptop',
        description: 'High end',
        price: 1200,
        stock: 5,
        category: 'Tech'
      });

    expect(createProd.statusCode).toBe(201);

    const createProdAsUser = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        title: 'Phone',
        description: 'Nice',
        price: 500,
        stock: 10,
        category: 'Tech'
      });

    expect(createProdAsUser.statusCode).toBe(403);
  });

  test('4) Checkout: add to cart -> place order -> stock decreases and cart clears (transactional)', async () => {
    const adminReg = await registerUser({
      name: 'Admin',
      email: 'admin@example.com',
      password: 'password123',
      role: 'admin',
      adminKeyHeader: process.env.ADMIN_SIGNUP_KEY
    });
    expect(adminReg.statusCode).toBe(201);

    const adminLogin = await loginUser({
      email: 'admin@example.com',
      password: 'password123'
    });
    expect(adminLogin.statusCode).toBe(200);
    const adminToken = adminLogin.body.token;

    const createProd = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Laptop',
        description: 'High end',
        price: 1200,
        stock: 5,
        category: 'Tech'
      });

    expect(createProd.statusCode).toBe(201);
    const productId = createProd.body.data.product._id;

    const userReg = await registerUser({
      name: 'John',
      email: 'john@example.com',
      password: 'password123'
    });
    expect(userReg.statusCode).toBe(201);

    const userLogin = await loginUser({
      email: 'john@example.com',
      password: 'password123'
    });

    expect(userLogin.statusCode).toBe(200);
    const userToken = userLogin.body.token;

    const addCart = await request(app)
      .post('/api/cart')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        productId,
        quantity: 2
      });

    expect(addCart.statusCode).toBe(200);

    const placeOrder = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${userToken}`)
      .send();

    expect(placeOrder.statusCode).toBe(201);

    const product = await Product.findById(productId);
    expect(product.stock).toBe(3);

    const cartRes = await request(app)
      .get('/api/cart')
      .set('Authorization', `Bearer ${userToken}`);

    expect(cartRes.statusCode).toBe(200);
    expect(cartRes.body.data.cart.items).toEqual([]);
    expect(cartRes.body.data.cart.totalPrice).toBe(0);
  });

  test('5) Account block enforcement: blocked user cannot access protected routes', async () => {
    const regRes = await registerUser({
      name: 'Blocked User',
      email: 'blocked@example.com',
      password: 'password123'
    });
    expect(regRes.statusCode).toBe(201);

    const loginRes = await loginUser({
      email: 'blocked@example.com',
      password: 'password123'
    });
    expect(loginRes.statusCode).toBe(200);

    const token = loginRes.body.token;

    await User.findOneAndUpdate({ email: 'blocked@example.com' }, { isBlocked: true });

    const protectedRes = await request(app)
      .get('/api/cart')
      .set('Authorization', `Bearer ${token}`);

    expect(protectedRes.statusCode).toBe(403);
    expect(protectedRes.body.message).toMatch(/suspended|blocked/i);
  });

  test('6) Order status transitions: invalid transition is rejected', async () => {
    // Admin
    const adminReg = await registerUser({
      name: 'Admin',
      email: 'admin@example.com',
      password: 'password123',
      role: 'admin',
      adminKeyHeader: process.env.ADMIN_SIGNUP_KEY
    });
    expect(adminReg.statusCode).toBe(201);

    const adminLogin = await loginUser({
      email: 'admin@example.com',
      password: 'password123'
    });
    expect(adminLogin.statusCode).toBe(200);
    const adminToken = adminLogin.body.token;

    // Create product
    const createProd = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Headphone',
        description: 'Noise cancelling',
        price: 300,
        stock: 5,
        category: 'Tech'
      });
    expect(createProd.statusCode).toBe(201);
    const productId = createProd.body.data.product._id;

    // Customer
    const userReg = await registerUser({
      name: 'User',
      email: 'user@example.com',
      password: 'password123'
    });
    expect(userReg.statusCode).toBe(201);

    const userLogin = await loginUser({
      email: 'user@example.com',
      password: 'password123'
    });
    expect(userLogin.statusCode).toBe(200);
    const userToken = userLogin.body.token;

    // Add to cart + order
    const addCart = await request(app)
      .post('/api/cart')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ productId, quantity: 1 });
    expect(addCart.statusCode).toBe(200);

    const placeOrder = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${userToken}`)
      .send();
    expect(placeOrder.statusCode).toBe(201);

    const orderId = placeOrder.body.data.order._id;

    // Invalid: Pending -> Delivered directly
    const invalidTransition = await request(app)
      .put(`/api/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'Delivered' });

    expect(invalidTransition.statusCode).toBe(400);
    expect(invalidTransition.body.message).toMatch(/invalid status transition/i);

    // Valid: Pending -> Shipped
    const shipped = await request(app)
      .put(`/api/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'Shipped' });

    expect(shipped.statusCode).toBe(200);

    // Valid: Shipped -> Delivered
    const delivered = await request(app)
      .put(`/api/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'Delivered' });

    expect(delivered.statusCode).toBe(200);
  });
});
