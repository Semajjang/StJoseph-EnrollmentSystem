import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { performance } from 'node:perf_hooks';

const parseArgs = (argv) => {
  const args = {};

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];

    if (!argument.startsWith('--')) {
      continue;
    }

    const key = argument.slice(2);
    const nextValue = argv[index + 1];

    if (!nextValue || nextValue.startsWith('--')) {
      args[key] = 'true';
      continue;
    }

    args[key] = nextValue;
    index += 1;
  }

  return args;
};

const percentile = (values, point) => {
  if (values.length === 0) {
    return 0;
  }

  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(point * sorted.length) - 1));
  return sorted[index];
};

const average = (values) => {
  if (values.length === 0) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
};

const formatMs = (value) => `${value.toFixed(2)} ms`;

const parseEnvFile = async (envFilePath) => {
  if (!envFilePath) {
    return {};
  }

  const resolvedPath = path.resolve(process.cwd(), envFilePath);
  const fileContents = await fs.readFile(resolvedPath, 'utf8');
  const envVars = {};

  fileContents.split(/\r?\n/).forEach((line) => {
    const trimmedLine = line.trim();

    if (!trimmedLine || trimmedLine.startsWith('#')) {
      return;
    }

    const separatorIndex = trimmedLine.indexOf('=');

    if (separatorIndex <= 0) {
      return;
    }

    const key = trimmedLine.slice(0, separatorIndex).trim();
    const value = trimmedLine.slice(separatorIndex + 1).trim();

    envVars[key] = value;
  });

  return envVars;
};

const interpolateValue = (value, variables) => {
  if (typeof value === 'string') {
    return value.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key) => {
      const variableValue = variables[key];
      return variableValue === undefined || variableValue === null ? '' : String(variableValue);
    });
  }

  if (Array.isArray(value)) {
    return value.map((entry) => interpolateValue(entry, variables));
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, interpolateValue(entry, variables)])
    );
  }

  return value;
};

const authenticateSupabasePasswordUser = async ({ authConfig, userId }) => {
  const envVars = {
    ...(authConfig.envFile ? await parseEnvFile(authConfig.envFile) : {}),
    ...process.env
  };
  const supabaseUrl = envVars[authConfig.urlEnvKey || 'VITE_SUPABASE_URL'];
  const anonKey = envVars[authConfig.anonKeyEnvKey || 'VITE_SUPABASE_ANON_KEY'];

  if (!supabaseUrl || !anonKey) {
    throw new Error('Supabase auth scenario requires VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY, either from process env or an envFile.');
  }

  const response = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: anonKey
    },
    body: JSON.stringify({
      email: authConfig.email,
      password: authConfig.password
    })
  });

  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload?.msg || payload?.error_description || payload?.error || `Supabase auth failed with HTTP ${response.status}`);
  }

  return {
    accessToken: payload.access_token,
    refreshToken: payload.refresh_token,
    userId: payload.user?.id || '',
    userEmail: payload.user?.email || authConfig.email,
    anonKey,
    supabaseUrl,
    virtualUserId: userId,
    timestamp: Date.now(),
    timestampIso: new Date().toISOString(),
    randomId: Math.random().toString(16).slice(2)
  };
};

const loadScenario = async (scenarioPath) => {
  const resolvedPath = path.resolve(process.cwd(), scenarioPath);
  const fileContents = await fs.readFile(resolvedPath, 'utf8');
  const parsedScenario = JSON.parse(fileContents);

  if (!parsedScenario || typeof parsedScenario !== 'object') {
    throw new Error('Scenario file must be a JSON object.');
  }

  if (!Array.isArray(parsedScenario.requests) || parsedScenario.requests.length === 0) {
    throw new Error('Scenario file must include a non-empty requests array.');
  }

  return parsedScenario;
};

const buildRequestUrl = (baseUrl, request) => {
  if (typeof request.url === 'string' && request.url.trim()) {
    return request.url;
  }

  if (typeof request.path !== 'string' || !request.path.trim()) {
    throw new Error(`Request '${request.name || 'unnamed'}' needs either a url or path value.`);
  }

  if (!baseUrl) {
    throw new Error(`Request '${request.name || 'unnamed'}' uses a relative path, but the scenario has no baseUrl.`);
  }

  return new URL(request.path, baseUrl).toString();
};

const runSingleRequest = async ({ baseUrl, timeoutMs, request, variables }) => {
  const resolvedRequest = interpolateValue(request, variables);
  const method = typeof resolvedRequest.method === 'string' ? resolvedRequest.method.toUpperCase() : 'GET';
  const requestUrl = buildRequestUrl(baseUrl, resolvedRequest);
  const controller = new AbortController();
  const startedAt = performance.now();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(requestUrl, {
      method,
      headers: resolvedRequest.headers || {},
      body: typeof resolvedRequest.body === 'string' ? resolvedRequest.body : resolvedRequest.body ? JSON.stringify(resolvedRequest.body) : undefined,
      signal: controller.signal
    });

    await response.text();
    const durationMs = performance.now() - startedAt;

    return {
      name: resolvedRequest.name || `${method} ${requestUrl}`,
      durationMs,
      ok: response.ok,
      status: response.status,
      error: response.ok ? null : `HTTP ${response.status}`
    };
  } catch (error) {
    const durationMs = performance.now() - startedAt;

    return {
      name: resolvedRequest.name || `${method} ${requestUrl}`,
      durationMs,
      ok: false,
      status: 0,
      error: error instanceof Error ? error.message : 'Unknown request error'
    };
  } finally {
    clearTimeout(timeoutId);
  }
};

const runVirtualUser = async ({ userId, scenario }) => {
  const iterationsPerUser = Number(scenario.iterationsPerUser || 1);
  const timeoutMs = Number(scenario.timeoutMs || 10000);
  const results = [];
  let scenarioVariables = {
    virtualUserId: userId,
    timestamp: Date.now(),
    timestampIso: new Date().toISOString(),
    randomId: Math.random().toString(16).slice(2)
  };

  if (scenario.auth?.type === 'supabase-password') {
    scenarioVariables = {
      ...scenarioVariables,
      ...(await authenticateSupabasePasswordUser({ authConfig: scenario.auth, userId }))
    };
  }

  for (let iteration = 0; iteration < iterationsPerUser; iteration += 1) {
    const iterationVariables = {
      ...scenarioVariables,
      iteration: iteration + 1,
      timestamp: Date.now(),
      timestampIso: new Date().toISOString(),
      randomId: Math.random().toString(16).slice(2)
    };

    for (const request of scenario.requests) {
      const result = await runSingleRequest({
        baseUrl: scenario.baseUrl,
        timeoutMs,
        request,
        variables: iterationVariables
      });

      results.push({
        ...result,
        userId,
        iteration: iteration + 1
      });
    }
  }

  return results;
};

const printUsage = () => {
  console.log('Usage: npm run load:test -- --scenario ./scripts/load-test.scenario.example.json [--concurrency 50]');
  console.log('');
  console.log('The scenario JSON can define baseUrl, auth, requests, timeoutMs, iterationsPerUser, and targets.');
};

const main = async () => {
  const args = parseArgs(process.argv.slice(2));

  if (args.help === 'true' || args.h === 'true') {
    printUsage();
    return;
  }

  const scenarioPath = args.scenario || './scripts/load-test.scenario.example.json';
  const scenario = await loadScenario(scenarioPath);
  const concurrency = Number(args.concurrency || scenario.concurrency || 50);
  const startedAt = performance.now();

  console.log(`Running load test from ${scenarioPath}`);
  console.log(`Virtual users: ${concurrency}`);
  console.log(`Iterations per user: ${Number(scenario.iterationsPerUser || 1)}`);
  console.log(`Requests per iteration: ${scenario.requests.length}`);
  console.log('');

  const results = (await Promise.all(
    Array.from({ length: concurrency }, (_, index) =>
      runVirtualUser({ userId: index + 1, scenario })
    )
  )).flat();

  const totalDurationMs = performance.now() - startedAt;
  const durations = results.map((result) => result.durationMs);
  const successCount = results.filter((result) => result.ok).length;
  const errorCount = results.length - successCount;
  const errorRatePct = results.length > 0 ? (errorCount / results.length) * 100 : 0;
  const throughput = totalDurationMs > 0 ? (results.length / totalDurationMs) * 1000 : 0;
  const targets = scenario.targets || {};

  console.log('Overall Results');
  console.log(`- Total requests: ${results.length}`);
  console.log(`- Successful requests: ${successCount}`);
  console.log(`- Failed requests: ${errorCount}`);
  console.log(`- Error rate: ${errorRatePct.toFixed(2)}%`);
  console.log(`- Average response time: ${formatMs(average(durations))}`);
  console.log(`- P95 response time: ${formatMs(percentile(durations, 0.95))}`);
  console.log(`- Max response time: ${formatMs(Math.max(...durations, 0))}`);
  console.log(`- Throughput: ${throughput.toFixed(2)} req/s`);
  console.log(`- Test duration: ${formatMs(totalDurationMs)}`);
  console.log('');

  const groupedResults = new Map();

  results.forEach((result) => {
    const group = groupedResults.get(result.name) || [];
    group.push(result);
    groupedResults.set(result.name, group);
  });

  console.log('Per Request Breakdown');
  groupedResults.forEach((requestResults, requestName) => {
    const requestDurations = requestResults.map((result) => result.durationMs);
    const requestErrors = requestResults.filter((result) => !result.ok).length;
    const requestErrorRate = requestResults.length > 0 ? (requestErrors / requestResults.length) * 100 : 0;

    console.log(`- ${requestName}`);
    console.log(`  count=${requestResults.length} avg=${formatMs(average(requestDurations))} p95=${formatMs(percentile(requestDurations, 0.95))} errors=${requestErrors} errorRate=${requestErrorRate.toFixed(2)}%`);
  });

  if (errorCount > 0) {
    console.log('');
    console.log('Sample Errors');
    results
      .filter((result) => !result.ok)
      .slice(0, 10)
      .forEach((result) => {
        console.log(`- ${result.name}: ${result.error}`);
      });
  }

  const checks = [
    {
      label: 'Average response target',
      passed: typeof targets.maxAverageMs !== 'number' || average(durations) <= targets.maxAverageMs,
      detail: typeof targets.maxAverageMs === 'number' ? `<= ${targets.maxAverageMs} ms` : 'not configured'
    },
    {
      label: 'P95 response target',
      passed: typeof targets.maxP95Ms !== 'number' || percentile(durations, 0.95) <= targets.maxP95Ms,
      detail: typeof targets.maxP95Ms === 'number' ? `<= ${targets.maxP95Ms} ms` : 'not configured'
    },
    {
      label: 'Error rate target',
      passed: typeof targets.maxErrorRatePct !== 'number' || errorRatePct <= targets.maxErrorRatePct,
      detail: typeof targets.maxErrorRatePct === 'number' ? `<= ${targets.maxErrorRatePct}%` : 'not configured'
    }
  ];

  console.log('');
  console.log('Target Evaluation');
  checks.forEach((check) => {
    console.log(`- ${check.label}: ${check.passed ? 'PASS' : 'FAIL'} (${check.detail})`);
  });

  const hasFailedTarget = checks.some((check) => !check.passed);
  process.exitCode = hasFailedTarget ? 1 : 0;
};

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});