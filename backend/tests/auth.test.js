const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const app = require('../src/app');
const { connectDB, disconnectDB } = require('../src/config/database');
const { User, ROLES } = require('../src/models/User');

describe('Authentication Module Tests', () => {
  let server;
  let baseUrl;

  before(async () => {
    // Connect to database
    await connectDB();

    // Start server on random open port
    await new Promise((resolve) => {
      server = app.listen(0, () => {
        const port = server.address().port;
        baseUrl = `http://127.0.0.1:${port}/api/v1`;
        resolve();
      });
    });
  });

  after(async () => {
    // Clean up test users
    await User.deleteMany({ email: /@testauth\.civic$/ });
    await new Promise((resolve) => server.close(resolve));
    await disconnectDB();
  });

  beforeEach(async () => {
    // Clear test accounts before each test
    await User.deleteMany({ email: /@testauth\.civic$/ });
  });

  it('POST /auth/register should successfully register an OFFICER account and return token', async () => {
    const res = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Officer John Doe',
        email: 'john.doe@testauth.civic',
        password: 'Password@123',
        department: 'Sanitation',
      }),
    });

    const data = await res.json();

    assert.strictEqual(res.status, 201);
    assert.strictEqual(data.success, true);
    assert.ok(data.data.token, 'Token should be returned');
    assert.strictEqual(data.data.user.name, 'Officer John Doe');
    assert.strictEqual(data.data.user.email, 'john.doe@testauth.civic');
    assert.strictEqual(data.data.user.role, ROLES.OFFICER);
    assert.strictEqual(data.data.user.passwordHash, undefined, 'passwordHash must never be returned');
  });

  it('POST /auth/register should reject public registration with ADMIN role', async () => {
    const res = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Hacker Trying Admin',
        email: 'hacker@testauth.civic',
        password: 'Password@123',
        role: 'ADMIN',
      }),
    });

    const data = await res.json();

    assert.strictEqual(res.status, 403);
    assert.strictEqual(data.success, false);
    assert.ok(data.message.includes('ADMIN'));
  });

  it('POST /auth/register should prevent duplicate email addresses', async () => {
    // First registration
    await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'First User',
        email: 'duplicate@testauth.civic',
        password: 'Password@123',
      }),
    });

    // Duplicate registration attempt
    const res = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Second User',
        email: 'duplicate@testauth.civic',
        password: 'Password@456',
      }),
    });

    const data = await res.json();

    assert.ok(res.status === 400 || res.status === 409);
    assert.strictEqual(data.success, false);
    assert.ok(data.message.includes('already registered'));
  });

  it('POST /auth/login should authenticate valid user and return user object & token', async () => {
    // Create test user
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('SecretPass@123', salt);
    await User.create({
      name: 'Login Test User',
      email: 'login.test@testauth.civic',
      passwordHash,
      role: ROLES.OFFICER,
      isActive: true,
    });

    const res = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'login.test@testauth.civic',
        password: 'SecretPass@123',
      }),
    });

    const data = await res.json();

    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.success, true);
    assert.ok(data.data.token);
    assert.strictEqual(data.data.user.email, 'login.test@testauth.civic');
    assert.strictEqual(data.data.user.role, ROLES.OFFICER);
    assert.strictEqual(data.data.user.passwordHash, undefined);
  });

  it('POST /auth/login should reject wrong password', async () => {
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('CorrectPassword@123', salt);
    await User.create({
      name: 'Wrong Pass User',
      email: 'wrongpass@testauth.civic',
      passwordHash,
      role: ROLES.OFFICER,
      isActive: true,
    });

    const res = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'wrongpass@testauth.civic',
        password: 'IncorrectPassword@999',
      }),
    });

    const data = await res.json();

    assert.strictEqual(res.status, 401);
    assert.strictEqual(data.success, false);
    assert.strictEqual(data.message, 'Invalid email or password');
  });

  it('POST /auth/login should reject inactive user accounts', async () => {
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('InactiveUser@123', salt);
    await User.create({
      name: 'Deactivated User',
      email: 'inactive@testauth.civic',
      passwordHash,
      role: ROLES.OFFICER,
      isActive: false, // Inactive
    });

    const res = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'inactive@testauth.civic',
        password: 'InactiveUser@123',
      }),
    });

    const data = await res.json();

    assert.strictEqual(res.status, 403);
    assert.strictEqual(data.success, false);
    assert.ok(data.message.includes('deactivated'));
  });

  it('GET /auth/me should return authenticated profile when valid Bearer token is passed', async () => {
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('MeProfile@123', salt);
    const user = await User.create({
      name: 'Profile Tester',
      email: 'profile@testauth.civic',
      passwordHash,
      role: ROLES.OFFICER,
      officerId: 'OFF-101',
      department: 'Roads & Infrastructure',
      isActive: true,
    });

    const secret = process.env.JWT_SECRET || 'super_secret_jwt_key_civic_forecasting_2026_secure';
    const token = jwt.sign({ userId: user._id.toString(), role: user.role, officerId: 'OFF-101' }, secret, {
      expiresIn: '1h',
    });

    const res = await fetch(`${baseUrl}/auth/me`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await res.json();

    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.data.user.email, 'profile@testauth.civic');
    assert.strictEqual(data.data.user.officerId, 'OFF-101');
    assert.strictEqual(data.data.user.department, 'Roads & Infrastructure');
    assert.strictEqual(data.data.user.passwordHash, undefined);
  });

  it('GET /auth/me should reject requests with invalid token', async () => {
    const res = await fetch(`${baseUrl}/auth/me`, {
      method: 'GET',
      headers: {
        Authorization: 'Bearer invalid.token.value',
      },
    });

    const data = await res.json();

    assert.strictEqual(res.status, 401);
    assert.strictEqual(data.success, false);
    assert.ok(data.message.includes('Invalid authentication token'));
  });

  it('GET /auth/me should reject requests with expired token', async () => {
    const secret = process.env.JWT_SECRET || 'super_secret_jwt_key_civic_forecasting_2026_secure';
    const expiredToken = jwt.sign({ userId: new mongoose.Types.ObjectId(), role: ROLES.OFFICER }, secret, {
      expiresIn: '-10s', // expired in the past
    });

    const res = await fetch(`${baseUrl}/auth/me`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${expiredToken}`,
      },
    });

    const data = await res.json();

    assert.strictEqual(res.status, 401);
    assert.strictEqual(data.success, false);
    assert.ok(data.message.includes('expired'));
  });

  it('GET /auth/me should reject token if user is inactive in database', async () => {
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('InactiveToken@123', salt);
    const user = await User.create({
      name: 'Now Deactivated User',
      email: 'deactivated.after.token@testauth.civic',
      passwordHash,
      role: ROLES.OFFICER,
      isActive: false,
    });

    const secret = process.env.JWT_SECRET || 'super_secret_jwt_key_civic_forecasting_2026_secure';
    const token = jwt.sign({ userId: user._id.toString(), role: user.role }, secret, {
      expiresIn: '1h',
    });

    const res = await fetch(`${baseUrl}/auth/me`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await res.json();

    assert.strictEqual(res.status, 403);
    assert.strictEqual(data.success, false);
    assert.ok(data.message.includes('deactivated'));
  });

  it('POST /auth/logout should return success response', async () => {
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('LogoutPass@123', salt);
    const user = await User.create({
      name: 'Logout User',
      email: 'logout@testauth.civic',
      passwordHash,
      role: ROLES.OFFICER,
      isActive: true,
    });

    const secret = process.env.JWT_SECRET || 'super_secret_jwt_key_civic_forecasting_2026_secure';
    const token = jwt.sign({ userId: user._id.toString(), role: user.role }, secret, {
      expiresIn: '1h',
    });

    const res = await fetch(`${baseUrl}/auth/logout`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await res.json();

    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.success, true);
    assert.ok(data.data.message.includes('Logged out'));
  });
});
