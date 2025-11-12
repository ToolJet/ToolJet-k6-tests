// ===================================================================
// ToolJet Load Test - OPTIMIZED FOR 15-30 RPS
// Requirements:
// - 500 VUs
// - Activities: Login + Minimal Activity + Logout
// - Target RPS: 15-30
// - Failure Rate: 0%
//
// Usage: k6 run -e VUS=500 tooljet_optimized_15_30_rps.js
// ===================================================================

import { sleep, group, check } from 'k6'
import http from 'k6/http'
import { SharedArray } from 'k6/data'

// ===================================================================
// CONFIGURATION
// ===================================================================

const TOOLJET_HOST = 'http://172.168.187.1';
const WORKSPACE_SLUG = 'tests-workspace';
const WORKSPACE_ID = 'f078c38d-736b-442f-980d-5baac530ebc7';
const TEST_APP_ID = 'ce63d70c-93bf-4491-8325-296914f67f66';

const TARGET_VUS = parseInt(__ENV.VUS || '500');

// User credentials
const endUsers = new SharedArray('endUsers', function () {
  return [
    { email: 'enduser1@testmail.com', password: 'test123' },
    { email: 'enduser2@testmail.com', password: 'test123' },
    { email: 'enduser3@testmail.com', password: 'test123' },
    { email: 'enduser4@testmail.com', password: 'test123' },
    { email: 'enduser5@testmail.com', password: 'test123' },
    { email: 'enduser6@testmail.com', password: 'test123' },
  ];
});

// ===================================================================
// RPS CALCULATION FOR 15-30 TARGET
// ===================================================================

// Target: 15-30 RPS with 500 VUs
// Current result: 323 RPS (way too high!)
// 
// Analysis:
// - Total requests per iteration: ~7 requests (login flow + minimal activity + logout)
// - Current iterations/s: 46.19
// - Current RPS: 323 (46.19 * 7 = 323)
// 
// Target calculation:
// - Current result with 18x: 5.48 RPS (too low!)
// - Need: 15-30 RPS
// - Adjustment: 15/5.48 = 2.74x increase needed
// - New multiplier: 18/2.74 = 6.57x
// 
// Using 6x multiplier for target 15-20 RPS

const SLEEP_MULTIPLIER = 6.0;  // Using 6x to achieve 15-30 RPS

console.log(`[CONFIG] VUs: ${TARGET_VUS}, Sleep Multiplier: ${SLEEP_MULTIPLIER}x`);
console.log(`[CONFIG] Target: 15-30 RPS with 0% failure rate`);

// ===================================================================
// STAGES CONFIGURATION
// ===================================================================

export const options = {
  stages: [
    { duration: '1m', target: 100 },      // Gradual ramp-up
    { duration: '1m', target: 250 },      // Continue ramping
    { duration: '1m', target: 500 },      // Reach target
    { duration: '7m', target: 500 },      // Steady state
    { duration: '1m', target: 250 },      // Ramp down
    { duration: '1m', target: 0 },        // Complete shutdown
  ],
  thresholds: {
    http_req_duration: ['p(95)<3000', 'p(99)<5000'],
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
  
  // DNS optimization
  dns: {
    ttl: '5m',
    select: 'first',
    policy: 'preferIPv4',
  },
};

console.log(`
╔════════════════════════════════════════════════════════════════╗
║         ToolJet Load Test - 15-30 RPS Configuration           ║
╠════════════════════════════════════════════════════════════════╣
║ Target VUs:        500                                         ║
║ Sleep Multiplier:  6.0x                                        ║
║ Target RPS:        15-30                                       ║
║ Total Duration:    12 minutes                                  ║
╠════════════════════════════════════════════════════════════════╣
║ Optimizations:                                                 ║
║   ✓ Adjusted sleep times (6x multiplier)                      ║
║   ✓ Connection reuse enabled                                   ║
║   ✓ Response body discarding                                   ║
║   ✓ Request batching                                           ║
║   ✓ DNS caching                                                ║
║   ✓ Minimal activities for 0% failure rate                    ║
║   ✓ Extended timeouts (60s)                                    ║
╚════════════════════════════════════════════════════════════════╝
`);

// ===================================================================
// HELPER FUNCTIONS
// ===================================================================

function getUserCredentials() {
  const endUserIndex = (__VU - 1) % endUsers.length;
  return { user: endUsers[endUserIndex], isBuilder: false };
}

function adjustedSleep(baseSeconds, randomSeconds = 0) {
  const totalSleep = baseSeconds + (Math.random() * randomSeconds);
  sleep(totalSleep * SLEEP_MULTIPLIER);
}

// ===================================================================
// SCENARIO - LOGIN + MINIMAL ACTIVITY + LOGOUT
// ===================================================================

function endUserScenario(credentials) {
  let response
  const headers = {
    'connection': 'keep-alive',
    'accept-encoding': 'gzip, deflate',
  };

  // ========== LOGIN FLOW ==========
  group('Login', function () {
    // Homepage
    response = http.get(`${TOOLJET_HOST}/`, {
      headers: {
        ...headers,
        accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      timeout: '60s',
    })

    check(response, { 
      'homepage loaded': (r) => r.status === 200,
      'response time OK': (r) => r.timings.duration < 3000,
    });
    
    adjustedSleep(5, 5);  // Base: 5-10s, Actual: 30-60s with 6x multiplier

    // Config APIs (batched)
    const batch_requests = [
      ['GET', `${TOOLJET_HOST}/api/config`, null, { headers: { ...headers, accept: '*/*', 'content-type': 'application/json' }, timeout: '60s' }],
      ['GET', `${TOOLJET_HOST}/api/organizations/public-configs`, null, { headers: { ...headers, accept: '*/*', 'content-type': 'application/json' }, timeout: '60s' }],
    ];
    
    http.batch(batch_requests);
    
    adjustedSleep(2, 2);  // Base: 2-4s, Actual: 12-24s

    // Authentication
    response = http.post(
      `${TOOLJET_HOST}/api/authenticate`,
      JSON.stringify({
        email: credentials.email,
        password: credentials.password,
        redirectTo: '/'
      }),
      {
        headers: {
          ...headers,
          accept: '*/*',
          'content-type': 'application/json',
          origin: TOOLJET_HOST,
        },
        timeout: '60s',
      }
    )

    check(response, { 
      'login successful': (r) => r.status === 201 || r.status === 200,
      'login response time OK': (r) => r.timings.duration < 2000,
    });
    
    adjustedSleep(3, 2);  // Base: 3-5s, Actual: 18-30s

    // Post-login workspace
    response = http.get(`${TOOLJET_HOST}/api/organizations`, {
      headers: {
        ...headers,
        'tj-workspace-id': WORKSPACE_ID,
        'content-type': 'application/json',
      },
      timeout: '60s',
    })
    
    adjustedSleep(2, 1);  // Base: 2-3s, Actual: 12-18s
  });

  // ========== MINIMAL ACTIVITY ==========
  group('MinimalActivity', function () {
    // Single dashboard load
    response = http.get(
      `${TOOLJET_HOST}/${WORKSPACE_SLUG}`,
      {
        headers: {
          ...headers,
          accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'tj-workspace-id': WORKSPACE_ID,
        },
        timeout: '60s',
      }
    )
    
    check(response, { 
      'dashboard loaded': (r) => r.status === 200 || r.status === 302,
    });
    
    adjustedSleep(3, 2);  // Base: 3-5s, Actual: 18-30s
  });

  // ========== LOGOUT ==========
  group('Logout', function () {
    response = http.get(`${TOOLJET_HOST}/api/logout`, {
      headers: {
        ...headers,
        'tj-workspace-id': WORKSPACE_ID,
        'content-type': 'application/json',
      },
      timeout: '60s',
    })
    
    check(response, { 
      'logout successful': (r) => r.status === 200 || r.status === 302,
    });
  });

  adjustedSleep(5, 5);  // Post-logout cooldown: Base 5-10s, Actual: 30-60s
}

// ===================================================================
// MAIN FUNCTION
// ===================================================================

export default function main() {
  const { user } = getUserCredentials();
  endUserScenario(user);
}

// ===================================================================
// SETUP & TEARDOWN
// ===================================================================

export function setup() {
  console.log('Starting load test optimized for 15-30 RPS...');
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
  console.log(`Target RPS: 15-30`);
  console.log(`VUs: ${TARGET_VUS}`);
  console.log(`Sleep Multiplier: ${SLEEP_MULTIPLIER}x`);
  console.log(`Expected iteration duration: ~60 seconds`);
  console.log(`Test Duration: ~12 minutes`);
  console.log('========================\n');
  
  return { startTime: Date.now() };
}

export function teardown(data) {
  const duration = (Date.now() - data.startTime) / 1000 / 60;
  console.log(`\n=== Test Summary ===`);
  console.log(`Test completed in ${duration.toFixed(2)} minutes`);
  console.log(`Sleep multiplier used: ${SLEEP_MULTIPLIER}x`);
  console.log(`Target RPS range: 15-30`);
  console.log(`Check metrics above to verify RPS achieved`);
  console.log('====================\n');
}