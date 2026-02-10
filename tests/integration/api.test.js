// tests/integration/api.test.js
const request = require("supertest");
const mongoose = require("mongoose");
const { MongoMemoryReplSet } = require("mongodb-memory-server");

let replset;
let app;

const Product = require("../../src/models/Product");

async function clearDatabase() {
  const collections = await mongoose.connection.db.collections();
  for (const collection of collections) {
    await collection.deleteMany({});
  }
}

beforeAll(async () => {
  process.env.NODE_ENV = "test";
  process.env.JWT_SECRET = process.env.JWT_SECRET || "test_jwt_secret_123";
  process.env.JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "30d";
  process.env.ADMIN_SIGNUP_KEY = process.env.ADMIN_SIGNUP_KEY || "test_admin_key_123";

  replset = await MongoMemoryReplSet.create({
    replSet: { count: 1 }
  });

  const uri = replset.getUri();
  await mongoose.connect(uri);

  app = require("../../src/app");
});

afterAll(async () => {
  await mongoose.disconnect();
  if (replset) await replset.stop();
});

afterEach(async () => {
  await clearDatabase();
});

describe("Mini E-Commerce API - Minimal Integration Tests", () => {
  test("1) Auth: register + login returns JWT and user (no password exposed)", async () => {
    const regRes = await request(app)
      .post("/api/auth/register")
      .send({
        name: "John Doe",
        email: "john@example.com",
        password: "password123"
      });

    expect(regRes.statusCode).toBe(201);
    expect(regRes.body).toHaveProperty("token");
    expect(regRes.body.data).toHaveProperty("user");
    expect(regRes.body.data.user.email).toBe("john@example.com");
    expect(regRes.body.data.user).not.toHaveProperty("password");

    const loginRes = await request(app)
      .post("/api/auth/login")
      .send({
        email: "john@example.com",
        password: "password123"
      });

    expect(loginRes.statusCode).toBe(200);
    expect(loginRes.body).toHaveProperty("token");
    expect(loginRes.body.data.user.email).toBe("john@example.com");
    expect(loginRes.body.data.user).not.toHaveProperty("password");
  });

  test("2) RBAC: admin can create product; customer cannot", async () => {
    await request(app)
      .post("/api/auth/register")
      .set("x-admin-signup-key", process.env.ADMIN_SIGNUP_KEY)
      .send({
        name: "Admin",
        email: "admin@example.com",
        password: "password123",
        role: "admin"
      });

    const adminLogin = await request(app)
      .post("/api/auth/login")
      .send({
        email: "admin@example.com",
        password: "password123"
      });

    expect(adminLogin.statusCode).toBe(200);
    const adminToken = adminLogin.body.token;

    await request(app)
      .post("/api/auth/register")
      .send({
        name: "User",
        email: "user@example.com",
        password: "password123"
      });

    const userLogin = await request(app)
      .post("/api/auth/login")
      .send({
        email: "user@example.com",
        password: "password123"
      });

    expect(userLogin.statusCode).toBe(200);
    const userToken = userLogin.body.token;

    const createProd = await request(app)
      .post("/api/products")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        title: "Laptop",
        description: "High end",
        price: 1200,
        stock: 5,
        category: "Tech"
      });

    expect(createProd.statusCode).toBe(201);

    const createProdAsUser = await request(app)
      .post("/api/products")
      .set("Authorization", `Bearer ${userToken}`)
      .send({
        title: "Phone",
        description: "Nice",
        price: 500,
        stock: 10,
        category: "Tech"
      });

    expect([401, 403]).toContain(createProdAsUser.statusCode);
  });

  test("3) Checkout: add to cart -> place order -> stock decreases and cart clears (transactional)", async () => {
    await request(app)
      .post("/api/auth/register")
      .set("x-admin-signup-key", process.env.ADMIN_SIGNUP_KEY)
      .send({
        name: "Admin",
        email: "admin@example.com",
        password: "password123",
        role: "admin"
      });

    const adminLogin = await request(app)
      .post("/api/auth/login")
      .send({
        email: "admin@example.com",
        password: "password123"
      });

    expect(adminLogin.statusCode).toBe(200);
    const adminToken = adminLogin.body.token;

    const createProd = await request(app)
      .post("/api/products")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        title: "Laptop",
        description: "High end",
        price: 1200,
        stock: 5,
        category: "Tech"
      });

    expect(createProd.statusCode).toBe(201);
    const productId = createProd.body.data.product._id;

    await request(app)
      .post("/api/auth/register")
      .send({
        name: "John",
        email: "john@example.com",
        password: "password123"
      });

    const userLogin = await request(app)
      .post("/api/auth/login")
      .send({
        email: "john@example.com",
        password: "password123"
      });

    expect(userLogin.statusCode).toBe(200);
    const userToken = userLogin.body.token;

    const addCart = await request(app)
      .post("/api/cart")
      .set("Authorization", `Bearer ${userToken}`)
      .send({
        productId,
        quantity: 2
      });

    expect(addCart.statusCode).toBe(200);

    const placeOrder = await request(app)
      .post("/api/orders")
      .set("Authorization", `Bearer ${userToken}`)
      .send();

    expect(placeOrder.statusCode).toBe(201);

    const product = await Product.findById(productId);
    expect(product.stock).toBe(3);

    const cartRes = await request(app)
      .get("/api/cart")
      .set("Authorization", `Bearer ${userToken}`);

    expect(cartRes.statusCode).toBe(200);
    expect(cartRes.body.data.cart.items).toEqual([]);
    expect(cartRes.body.data.cart.totalPrice).toBe(0);
  });
});
