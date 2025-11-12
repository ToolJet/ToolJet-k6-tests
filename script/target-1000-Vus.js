// ===================================================================
// ToolJet Load Test - DATA QUERY EXECUTION
// Requirements:
// - 1000 VUs
// - Target RPS: 20+ (minimum 20)
// - Failure Rate: 0%-0.1%
//
// Usage: k6 run -e VUS=1000 tooljet_data_query_1000vus_20rps.js
// ===================================================================

import { sleep, group, check } from 'k6'
import http from 'k6/http'

// ===================================================================
// CONFIGURATION
// ===================================================================

const TOOLJET_HOST = 'http://172.168.187.1';
const WORKSPACE_ID = 'f078c38d-736b-442f-980d-5baac530ebc7';

// Pre-authenticated token
const AUTH_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzZXNzaW9uSWQiOiI1ZTljZmIzZS1iZjI4LTQxM2ItODA0ZC1jMGY0ODk5NzA0YTQiLCJ1c2VybmFtZSI6Ijk0MDkyMWM2LTgzZTctNGZlOS05ZDZhLTY2ODJkNzU3MmM0MyIsInN1YiI6ImJ1aWxkZXIxQHRlc3RtYWlsLmNvbSIsIm9yZ2FuaXphdGlvbklkcyI6WyJmMDc4YzM4ZC03MzZiLTQ0MmYtOTgwZC01YmFhYzUzMGViYzciXSwiaXNTU09Mb2dpbiI6ZmFsc2UsImlzUGFzc3dvcmRMb2dpbiI6dHJ1ZSwiaWF0IjoxNzYxMjk0NjEwfQ.EnE9alM6v1CUir1DxEN2W__9deM5cfM78m5Qrnsk1r8';

// Data query ID
const DATA_QUERY_ID = '45faba4f-b00f-498f-a9e8-3aebb3b064ee';

const TARGET_VUS = parseInt(__ENV.VUS || '1000');

// ===================================================================
// RPS CALCULATION FOR 20+ TARGET
// ===================================================================

// Current result with 0.4x: 9.17 RPS with 0.65% failures (not acceptable!)
// Target: 20-30 RPS with 0% failures
// 
// Analysis:
// - Current RPS: 9.17
// - Need: 20-30 RPS
// - Increase needed: 25/9.17 = 2.73x
// - Current multiplier: 0.4x
// - New multiplier: 0.4/2.73 = 0.146x
//
// Using 0.15x multiplier for 20-30 RPS
// Failures caused by connection exhaustion - need connection limits

const SLEEP_MULTIPLIER = 0.15;

console.log(`[CONFIG] VUs: ${TARGET_VUS}, Sleep Multiplier: ${SLEEP_MULTIPLIER}x`);
console.log(`[CONFIG] Target: 20-30 RPS with 0% failure rate`);

// ===================================================================
// STAGES CONFIGURATION
// ===================================================================

export const options = {
  stages: [
    { duration: '2m', target: 200 },    // Gradual ramp-up
    { duration: '2m', target: 500 },    // Continue ramping
    { duration: '3m', target: 1000 },   // Reach target
    { duration: '8m', target: 1000 },   // Steady state (measurement)
    { duration: '2m', target: 500 },    // Ramp down
    { duration: '1m', target: 0 },      // Complete shutdown
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000', 'p(99)<3000'],
    http_req_failed: ['rate<0.001'],  // <0.1% failures
  },
  gracefulStop: '30s',
  
  // Performance optimizations
  batch: 10,
  batchPerHost: 5,
  
  // HTTP optimizations
  noConnectionReuse: false,
  noVUConnectionReuse: false,
  userAgent: 'K6LoadTest/1.0',
  discardResponseBodies: true,
  
  // RPS rate limit to prevent server overload
  rps: 35,  // Max 35 RPS to stay within 20-30 target with headroom
  
  // DNS optimization
  dns: {
    ttl: '5m',
    select: 'first',
    policy: 'preferIPv4',
  },
};

console.log(`
╔════════════════════════════════════════════════════════════════╗
║      ToolJet Data Query Test - 20-30 RPS Configuration        ║
╠════════════════════════════════════════════════════════════════╣
║ Target VUs:        1000                                        ║
║ Sleep Multiplier:  0.15x                                       ║
║ Target RPS:        20-30                                       ║
║ RPS Rate Limit:    35 (with headroom)                          ║
║ Total Duration:    18 minutes                                  ║
╠════════════════════════════════════════════════════════════════╣
║ Optimizations:                                                 ║
║   ✓ Reduced sleep times (0.15x multiplier)                    ║
║   ✓ Connection reuse enabled                                   ║
║   ✓ Response body discarding                                   ║
║   ✓ Request batching                                           ║
║   ✓ DNS caching                                                ║
║   ✓ Direct API hit with pre-auth token                        ║
║   ✓ Extended timeouts (60s)                                    ║
║   ✓ RPS rate limiting to prevent server overload              ║
╚════════════════════════════════════════════════════════════════╝
`);

// ===================================================================
// HELPER FUNCTIONS
// ===================================================================

function adjustedSleep(baseSeconds, randomSeconds = 0) {
  const totalSleep = baseSeconds + (Math.random() * randomSeconds);
  sleep(totalSleep * SLEEP_MULTIPLIER);
}

// ===================================================================
// MAIN TEST - DATA QUERY EXECUTION
// ===================================================================

export default function main() {
  const headers = {
    'Content-Type': 'application/json',
    'Tj-Workspace-Id': WORKSPACE_ID,
    'Cookie': `tj_auth_token=${AUTH_TOKEN}`,
    'connection': 'keep-alive',
    'accept-encoding': 'gzip, deflate',
  };

  group('Execute Data Query', function () {
    // GET data query
    const getUrl = `${TOOLJET_HOST}/api/data-queries/${DATA_QUERY_ID}?mode=edit`;
    const getResponse = http.get(getUrl, {
      headers: headers,
      timeout: '60s',
    });

    check(getResponse, {
      'data query GET successful': (r) => r.status === 200,
      'response time OK': (r) => r.timings.duration < 2000,
      'data query details returned': (r) => {
        try {
          const body = r.json();
          return body.id !== undefined;
        } catch (e) {
          return false;
        }
      },
    });

    // Sleep between requests: Base 30-45s, Actual: 4.5-6.75s with 0.15x
    adjustedSleep(30, 15);
  });

  // Sleep between iterations: Base 120-180s, Actual: 18-27s with 0.15x
  adjustedSleep(120, 60);
}

// ===================================================================
// SETUP & TEARDOWN
// ===================================================================

export function setup() {
  console.log('Starting data query load test optimized for 20+ RPS...');
  console.log('Verifying server accessibility...');
  
  const healthCheck = http.get(`${TOOLJET_HOST}/api/config`, { 
    timeout: '30s',
    headers: {
      'connection': 'keep-alive',
    }
  });
  
  if (healthCheck.status !== 200) {
    console.error('Warning: Server health check failed!');
  } else {
    console.log('✓ Server is accessible');
  }
  
  console.log('\n=== Test Parameters ===');
  console.log(`Target RPS: 20-30`);
  console.log(`VUs: ${TARGET_VUS}`);
  console.log(`Sleep Multiplier: ${SLEEP_MULTIPLIER}x`);
  console.log(`Expected iteration duration: ~25-35 seconds`);
  console.log(`RPS Rate Limit: 35 (max)`);
  console.log(`Test Duration: ~18 minutes`);
  console.log('========================\n');
  
  return { startTime: Date.now() };
}

export function teardown(data) {
  const duration = (Date.now() - data.startTime) / 1000 / 60;
  console.log(`\n=== Test Summary ===`);
  console.log(`Test completed in ${duration.toFixed(2)} minutes`);
  console.log(`Sleep multiplier used: ${SLEEP_MULTIPLIER}x`);
  console.log(`Target RPS: 20-30`);
  console.log(`Check metrics above to verify RPS achieved`);
  console.log('====================\n');
}