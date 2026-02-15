const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryReplSet } = require('mongodb-memory-server');

let replset;
let app;

const User = require('../../src/models/User');
const Product = require('../../src/models/Product');

async function clearDatabase() {
  const collections = await mongoose.connection.db.collections();
  for (const collection of collections) {
    await collection.deleteMany({});
  }
}

function expectStatus(res, expected, label = 'Request') {
  if (res.statusCode !== expected) {
    // eslint-disable-next-line no-console
    console.error(`${label} failed:`, {
      expected,
      received: res.statusCode,
      body: res.body
    });
  }
  expect(res.statusCode).toBe(expected);
}

async function registerUser({
  name,
  email,
  password,
  role,
  adminKeyHeader,
  adminKeyBody
}) {
  const req = request(app).post('/api/auth/register');

  if (adminKeyHeader) {
    req.set('x-admin-signup-key', adminKeyHeader);
  }

  const payload = { name, email, password };
  if (role) payload.role = role;
  if (adminKeyBody) payload.adminKey = adminKeyBody;

  return req.send(payload);
}

async function loginUser({ email, password }) {
  return request(app).post('/api/auth/login').send({ email, password });
}

async function createProductAsAdmin(token, overrides = {}) {
  return request(app)
    .post('/api/products')
    .set('Authorization', `Bearer ${token}`)
    .send({
      title: 'Laptop',
      description: 'High end laptop',
      price: 1200,
      stock: 5,
      category: 'Tech',
      ...overrides
    });
}

beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_jwt_secret_123';
  process.env.JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '30d';
  process.env.ADMIN_SIGNUP_KEY = process.env.ADMIN_SIGNUP_KEY || 'test_admin_key_123';

  replset = await MongoMemoryReplSet.create({
    replSet: { count: 1 }
  });

  const uri = replset.getUri();
  await mongoose.connect(uri);

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

    expectStatus(regRes, 201, 'Register');
    expect(regRes.body).toHaveProperty('token');
    expect(regRes.body.data).toHaveProperty('user');
    expect(regRes.body.data.user.email).toBe('john@example.com');
    expect(regRes.body.data.user).not.toHaveProperty('password');

    const loginRes = await loginUser({
      email: 'john@example.com',
      password: 'password123'
    });

    expectStatus(loginRes, 200, 'Login');
    expect(loginRes.body).toHaveProperty('token');
    expect(loginRes.body.data.user.email).toBe('john@example.com');
    expect(loginRes.body.data.user).not.toHaveProperty('password');
  });

  test('2) Auth hardening: admin signup is blocked without admin key', async () => {
    const res = await registerUser({
      name: 'Bad Admin',
      email: 'badadmin@example.com',
      password: 'password123',
      role: 'admin'
    });

    expect(res.statusCode).toBe(403);
  });

  test('3) RBAC: admin can create product; customer cannot', async () => {
    const adminReg = await registerUser({
      name: 'Admin',
      email: 'admin@example.com',
      password: 'password123',
      role: 'admin',
      adminKeyHeader: process.env.ADMIN_SIGNUP_KEY
    });
    expectStatus(adminReg, 201, 'Admin register');

    const adminLogin = await loginUser({
      email: 'admin@example.com',
      password: 'password123'
    });
    expectStatus(adminLogin, 200, 'Admin login');
    const adminToken = adminLogin.body.token;

    const userReg = await registerUser({
      name: 'User',
      email: 'user@example.com',
      password: 'password123'
    });
    expectStatus(userReg, 201, 'User register');

    const userLogin = await loginUser({
      email: 'user@example.com',
      password: 'password123'
    });
    expectStatus(userLogin, 200, 'User login');
    const userToken = userLogin.body.token;

    const createProd = await createProductAsAdmin(adminToken);
    expectStatus(createProd, 201, 'Create product as admin');

    const createProdAsUser = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        title: 'Phone',
        description: 'Nice phone',
        price: 500,
        stock: 10,
        category: 'Tech'
      });

    expect([401, 403]).toContain(createProdAsUser.statusCode);
  });

  test('4) Checkout: add to cart -> place order -> stock decreases and cart clears (transactional)', async () => {
    const adminReg = await registerUser({
      name: 'Admin',
      email: 'admin@example.com',
      password: 'password123',
      role: 'admin',
      adminKeyHeader: process.env.ADMIN_SIGNUP_KEY
    });
    expectStatus(adminReg, 201, 'Admin register');

    const adminLogin = await loginUser({
      email: 'admin@example.com',
      password: 'password123'
    });
    expectStatus(adminLogin, 200, 'Admin login');
    const adminToken = adminLogin.body.token;

    const createProd = await createProductAsAdmin(adminToken, {
      title: 'Checkout Laptop'
    });
    expectStatus(createProd, 201, 'Create product for checkout');
    const productId = createProd.body.data.product._id;

    const userReg = await registerUser({
      name: 'John',
      email: 'john@example.com',
      password: 'password123'
    });
    expectStatus(userReg, 201, 'User register');

    const userLogin = await loginUser({
      email: 'john@example.com',
      password: 'password123'
    });
    expectStatus(userLogin, 200, 'User login');
    const userToken = userLogin.body.token;

    const addCart = await request(app)
      .post('/api/cart')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ productId, quantity: 2 });
    expectStatus(addCart, 200, 'Add to cart');

    const placeOrder = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${userToken}`)
      .send();
    expectStatus(placeOrder, 201, 'Place order');

    const product = await Product.findById(productId);
    expect(product.stock).toBe(3);

    const cartRes = await request(app)
      .get('/api/cart')
      .set('Authorization', `Bearer ${userToken}`);

    expectStatus(cartRes, 200, 'Get cart');
    expect(cartRes.body.data.cart.items).toEqual([]);
    expect(cartRes.body.data.cart.totalPrice).toBe(0);
  });

  test('5) Account block enforcement: blocked user cannot access protected routes', async () => {
    const regRes = await registerUser({
      name: 'Blocked User',
      email: 'blocked@example.com',
      password: 'password123'
    });
    expectStatus(regRes, 201, 'Blocked user register');

    const user = await User.findOne({ email: 'blocked@example.com' });
    user.isBlocked = true;
    await user.save();

    const loginRes = await loginUser({
      email: 'blocked@example.com',
      password: 'password123'
    });
    expect(loginRes.statusCode).toBe(403);

    // Also verify middleware enforcement if a token was minted earlier in some scenario
    const freshUser = await User.findOne({ email: 'blocked@example.com' }).select('+password');
    const jwt = require('jsonwebtoken');
    const token = jwt.sign({ id: freshUser._id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '30d'
    });

    const protectedRes = await request(app)
      .get('/api/cart')
      .set('Authorization', `Bearer ${token}`);

    expect(protectedRes.statusCode).toBe(403);
  });

  test('6) Order status transitions: invalid transition is rejected', async () => {
    // Admin setup
    const adminReg = await registerUser({
      name: 'Admin',
      email: 'admin@example.com',
      password: 'password123',
      role: 'admin',
      adminKeyHeader: process.env.ADMIN_SIGNUP_KEY
    });
    expectStatus(adminReg, 201, 'Admin register');

    const adminLogin = await loginUser({
      email: 'admin@example.com',
      password: 'password123'
    });
    expectStatus(adminLogin, 200, 'Admin login');
    const adminToken = adminLogin.body.token;

    // Product setup (full valid payload)
    const createProd = await createProductAsAdmin(adminToken, {
      title: 'Transition Product',
      description: 'For transition test',
      category: 'Testing',
      price: 999,
      stock: 10
    });
    expectStatus(createProd, 201, 'Create product for transitions');
    const productId = createProd.body.data.product._id;

    // Customer setup
    const userReg = await registerUser({
      name: 'Customer',
      email: 'customer@example.com',
      password: 'password123'
    });
    expectStatus(userReg, 201, 'Customer register');

    const userLogin = await loginUser({
      email: 'customer@example.com',
      password: 'password123'
    });
    expectStatus(userLogin, 200, 'Customer login');
    const userToken = userLogin.body.token;

    // Place order
    const addCart = await request(app)
      .post('/api/cart')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ productId, quantity: 1 });
    expectStatus(addCart, 200, 'Add to cart');

    const placeOrder = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${userToken}`)
      .send();
    expectStatus(placeOrder, 201, 'Place order');

    const orderId = placeOrder.body.data.order._id;

    // Invalid transition: Pending -> Delivered (should fail)
    const invalidTransition = await request(app)
      .put(`/api/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'Delivered' });

    expect(invalidTransition.statusCode).toBe(400);

    // Valid transition: Pending -> Shipped
    const shipped = await request(app)
      .put(`/api/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'Shipped' });

    expectStatus(shipped, 200, 'Pending -> Shipped');

    // Invalid transition: Shipped -> Pending
    const invalidBack = await request(app)
      .put(`/api/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'Pending' });

    expect(invalidBack.statusCode).toBe(400);
  });
});
