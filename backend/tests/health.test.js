const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const app = require('../src/app');

describe('Health Check and Core App API Tests', () => {
  let server;
  let baseUrl;

  before(() => {
    return new Promise((resolve) => {
      server = app.listen(0, () => {
        const port = server.address().port;
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });
  });

  after(() => {
    return new Promise((resolve) => {
      server.close(resolve);
    });
  });

  it('GET /api/v1/health should return status 200 and healthy payload', async () => {
    const res = await fetch(`${baseUrl}/api/v1/health`);
    const data = await res.json();

    assert.strictEqual(res.status, 200);
    assert.deepStrictEqual(data, {
      success: true,
      service: 'civic-forecasting-api',
      status: 'healthy',
    });
  });

  it('GET /unknown-route should return 404 with standard error structure', async () => {
    const res = await fetch(`${baseUrl}/api/v1/unknown-endpoint`);
    const data = await res.json();

    assert.strictEqual(res.status, 404);
    assert.strictEqual(data.success, false);
    assert.strictEqual(typeof data.message, 'string');
    assert.strictEqual(Array.isArray(data.errors), true);
  });
});
