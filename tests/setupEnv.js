// tests/setupEnv.js
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_jwt_secret_123';
process.env.JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '30d';
process.env.ADMIN_SIGNUP_KEY = process.env.ADMIN_SIGNUP_KEY || 'test_admin_key_123';
