const BASE_URL = process.env.SMOKE_BASE_URL || 'http://localhost:3000';
const COOKIE_HEADER = process.env.SMOKE_COOKIE || '';
const MAX_HEALTH_MS = Number.parseInt(process.env.SMOKE_MAX_HEALTH_MS || '4000', 10);
const MAX_MONGO_PING_MS = Number.parseInt(process.env.SMOKE_MAX_MONGO_PING_MS || '6000', 10);
const MAX_TRAINEE_DASHBOARD_MS = Number.parseInt(process.env.SMOKE_MAX_TRAINEE_DASHBOARD_MS || '5000', 10);
const MAX_ADMIN_DASHBOARD_MS = Number.parseInt(process.env.SMOKE_MAX_ADMIN_DASHBOARD_MS || '5000', 10);

const PERF_LIMITS = {
  '/api/health': MAX_HEALTH_MS,
  '/api/mongodb/ping': MAX_MONGO_PING_MS,
  '/trainee/dashboard': MAX_TRAINEE_DASHBOARD_MS,
  '/admin/dashboard': MAX_ADMIN_DASHBOARD_MS,
};

const ENABLE_WARMUP = process.env.SMOKE_ENABLE_WARMUP !== 'false';

function buildHeaders(extra = {}) {
  const headers = { ...extra };
  if (COOKIE_HEADER) {
    headers.Cookie = COOKIE_HEADER;
  }
  return headers;
}

async function check(path, expectedStatuses = [200], options = {}) {
  const start = Date.now();
  const response = await fetch(`${BASE_URL}${path}`, {
    method: options.method || 'GET',
    body: options.body,
    headers: buildHeaders(options.headers || {}),
    redirect: 'manual',
  });
  const elapsed = Date.now() - start;
  const ok = expectedStatuses.includes(response.status);

  return {
    path,
    method: options.method || 'GET',
    status: response.status,
    elapsed,
    ok,
  };
}

async function warmup(path) {
  try {
    await fetch(`${BASE_URL}${path}`, {
      headers: buildHeaders(),
      redirect: 'manual',
    });
  } catch {
    // Warmup failures are ignored; measured checks below remain strict.
  }
}

async function run() {
  const checks = [
    { path: '/api/health', statuses: [200, 503] },
    { path: '/api/mongodb/ping', statuses: [200, 500] },
    { path: '/api/auth/me', statuses: [200, 401] },
    { path: '/trainee/dashboard', statuses: [200, 307, 308] },
    { path: '/admin/dashboard', statuses: [200, 307, 308] },
    { path: '/api/trainee/training/overview', statuses: [200, 401, 403] },
    { path: '/api/admin/overview/stats', statuses: [200, 401, 403] },

    // Safe mutation-path smoke checks (no side effects expected)
    {
      path: '/api/auth/login',
      method: 'POST',
      statuses: [403],
      body: JSON.stringify({ identifier: 'smoke@example.com', password: 'invalid', role: 'trainee' }),
      headers: { 'Content-Type': 'application/json' },
    },
    {
      path: '/api/admin/courses/generate-quiz',
      method: 'POST',
      statuses: [401, 403],
      body: JSON.stringify({ topic: 'smoke test', count: 1, language: 'english' }),
      headers: { 'Content-Type': 'application/json' },
    },
    {
      path: '/api/trainee/enrollments/smoke-course',
      method: 'POST',
      statuses: [401, 403],
      body: JSON.stringify({}),
      headers: { 'Content-Type': 'application/json' },
    },
  ];

  if (ENABLE_WARMUP) {
    console.log('Running warmup pass...');
    for (const checkDef of checks) {
      if ((checkDef.method || 'GET') !== 'GET') {
        continue;
      }
      const path = checkDef.path;
      await warmup(path);
    }
  }

  const results = [];
  for (const checkDef of checks) {
    const headers = checkDef.headers || {};
    results.push(
      await check(checkDef.path, checkDef.statuses, {
        method: checkDef.method,
        body: checkDef.body,
        headers,
      })
    );
  }

  const failed = results.filter((item) => !item.ok);
  const perfFailed = results.filter((item) => {
    const limit = PERF_LIMITS[item.path];
    return typeof limit === 'number' && item.elapsed > limit;
  });

  console.log('--- Smoke Check Results ---');
  for (const item of results) {
    console.log(`${item.ok ? 'OK  ' : 'FAIL'} [${item.method}] ${item.path} -> ${item.status} (${item.elapsed}ms)`);
  }

  if (perfFailed.length > 0) {
    console.error('--- Performance Threshold Failures ---');
    for (const item of perfFailed) {
      const limit = PERF_LIMITS[item.path];
      console.error(`SLOW ${item.path} -> ${item.elapsed}ms (limit ${limit}ms)`);
    }
  }

  if (failed.length > 0 || perfFailed.length > 0) {
    if (failed.length > 0) {
      console.error(`Smoke checks failed: ${failed.length}`);
    }
    if (perfFailed.length > 0) {
      console.error(`Performance thresholds failed: ${perfFailed.length}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log('All smoke checks passed.');
}

run().catch((error) => {
  console.error('Smoke check crashed:', error instanceof Error ? error.message : error);
  process.exit(1);
});
