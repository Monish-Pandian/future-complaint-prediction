const mongoose = require('mongoose');
const axios = require('axios');
require('../src/models');

const BASE_URL = 'http://127.0.0.1:5000/api/v1';

async function measureLatency(method, url, headers = {}, body = null, runs = 3) {
  const times = [];
  let status = 200;
  for (let i = 0; i < runs; i++) {
    const start = process.hrtime.bigint();
    try {
      const res = await axios({
        method,
        url,
        headers,
        data: body,
        timeout: 10000,
        validateStatus: () => true, // Don't throw on non-2xx
      });
      const end = process.hrtime.bigint();
      status = res.status;
      const durationMs = Number(end - start) / 1e6;
      times.push(durationMs);
    } catch (err) {
      times.push(9999);
    }
  }
  const min = Math.min(...times).toFixed(1);
  const max = Math.max(...times).toFixed(1);
  const avg = (times.reduce((a, b) => a + b, 0) / times.length).toFixed(1);
  return { min: Number(min), avg: Number(avg), max: Number(max), status };
}

async function runAudit() {
  await mongoose.connect('mongodb://127.0.0.1:27017/civic_forecasting');
  
  // Authenticate Admin & Officer to get real JWTs
  const adminRes = await axios.post(`${BASE_URL}/auth/login`, {
    email: 'monish@gmail.com',
    password: 'Monish',
  });
  const adminToken = adminRes.data?.data?.token;

  const officerRes = await axios.post(`${BASE_URL}/auth/login`, {
    email: 'off-00001@civic.gov',
    password: 'OfficerPass@123',
  });
  const officerToken = officerRes.data?.data?.token;

  console.log('=== API SECURITY & NEGATIVE TESTING ===');
  // 1. No auth
  const noAuth = await axios.get(`${BASE_URL}/admin/predictions`, { validateStatus: () => true });
  console.log('1. No Auth -> /admin/predictions Status:', noAuth.status, '(Expected 401)');

  // 2. Invalid bearer
  const badToken = await axios.get(`${BASE_URL}/admin/predictions`, {
    headers: { Authorization: 'Bearer invalid_garbage_token_here' },
    validateStatus: () => true,
  });
  console.log('2. Bad Bearer -> /admin/predictions Status:', badToken.status, '(Expected 401)');

  // 3. Officer JWT -> Admin route
  const officerOnAdmin = await axios.get(`${BASE_URL}/admin/assignments`, {
    headers: { Authorization: `Bearer ${officerToken}` },
    validateStatus: () => true,
  });
  console.log('3. Officer JWT -> /admin/assignments Status:', officerOnAdmin.status, '(Expected 403)');

  // 4. NoSQL Operator injection
  const injection = await axios.get(`${BASE_URL}/admin/predictions?status[$ne]=xyz`, {
    headers: { Authorization: `Bearer ${adminToken}` },
    validateStatus: () => true,
  });
  console.log('4. NoSQL Injection Query ($ne) Status:', injection.status, '(Expected 400)');

  // 5. Invalid ObjectId format
  const badId = await axios.get(`${BASE_URL}/admin/predictions/invalid_object_id_123`, {
    headers: { Authorization: `Bearer ${adminToken}` },
    validateStatus: () => true,
  });
  console.log('5. Bad ObjectId -> /admin/predictions/invalid_id Status:', badId.status, '(Expected 400)');

  // 6. XSS / Malicious script tag in query
  const xssParam = await axios.get(`${BASE_URL}/admin/predictions?search=<script>alert(1)</script>`, {
    headers: { Authorization: `Bearer ${adminToken}` },
    validateStatus: () => true,
  });
  console.log('6. XSS in search query Status:', xssParam.status, '(Expected 200 clean sanitize or 400)');

  // 7. Path Traversal in params
  const traversal = await axios.get(`${BASE_URL}/admin/predictions/..%2F..%2Fetc%2Fpasswd`, {
    headers: { Authorization: `Bearer ${adminToken}` },
    validateStatus: () => true,
  });
  console.log('7. Path traversal parameter Status:', traversal.status, '(Expected 400/404)');

  console.log('\n=== API PERFORMANCE BENCHMARKS (3 runs per endpoint) ===');
  const endpoints = [
    { name: 'System Health', method: 'GET', url: 'http://127.0.0.1:5000/api/health', headers: {} },
    { name: 'Admin Dashboard Stats', method: 'GET', url: `${BASE_URL}/admin/dashboard`, headers: { Authorization: `Bearer ${adminToken}` } },
    { name: 'Admin Predictions List', method: 'GET', url: `${BASE_URL}/admin/predictions?limit=10`, headers: { Authorization: `Bearer ${adminToken}` } },
    { name: 'Admin Heatmap / Map', method: 'GET', url: `${BASE_URL}/admin/heatmap`, headers: { Authorization: `Bearer ${adminToken}` } },
    { name: 'Admin Assignments', method: 'GET', url: `${BASE_URL}/admin/assignments?limit=10`, headers: { Authorization: `Bearer ${adminToken}` } },
    { name: 'Admin Officers List', method: 'GET', url: `${BASE_URL}/admin/officers?limit=10`, headers: { Authorization: `Bearer ${adminToken}` } },
    { name: 'Admin Verifications', method: 'GET', url: `${BASE_URL}/admin/verifications?limit=10`, headers: { Authorization: `Bearer ${adminToken}` } },
    { name: 'Admin Evaluation Metrics', method: 'GET', url: `${BASE_URL}/admin/evaluation/metrics`, headers: { Authorization: `Bearer ${adminToken}` } },
    { name: 'Admin Active Model', method: 'GET', url: `${BASE_URL}/admin/model/active`, headers: { Authorization: `Bearer ${adminToken}` } },
    { name: 'Officer Dashboard Stats', method: 'GET', url: `${BASE_URL}/officer/dashboard`, headers: { Authorization: `Bearer ${officerToken}` } },
    { name: 'Officer Assignments', method: 'GET', url: `${BASE_URL}/officer/assignments`, headers: { Authorization: `Bearer ${officerToken}` } },
    { name: 'Officer Verifications', method: 'GET', url: `${BASE_URL}/officer/verifications`, headers: { Authorization: `Bearer ${officerToken}` } },
    { name: 'Officer History', method: 'GET', url: `${BASE_URL}/officer/verification-history`, headers: { Authorization: `Bearer ${officerToken}` } },
  ];

  const results = [];
  for (const ep of endpoints) {
    const lat = await measureLatency(ep.method, ep.url, ep.headers, null, 3);
    const classification = lat.avg < 150 ? 'FAST' : lat.avg < 500 ? 'ACCEPTABLE' : lat.avg < 1500 ? 'SLOW' : 'CRITICAL';
    results.push({ ...ep, ...lat, classification });
    console.log(
      ep.name.padEnd(26),
      `Status: ${lat.status}`.padEnd(13),
      `Avg: ${lat.avg}ms`.padEnd(14),
      `Min: ${lat.min}ms`.padEnd(13),
      `Max: ${lat.max}ms`.padEnd(13),
      `Class: ${classification}`
    );
  }

  await mongoose.disconnect();
}

runAudit().catch(console.error);
