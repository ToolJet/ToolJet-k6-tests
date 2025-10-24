// ===================================================================
// K6 Load Test Configuration
// Central configuration for all ToolJet load tests
// ===================================================================

// Base ToolJet Instance Configuration
export const BASE_URL = __ENV.BASE_URL || 'http://172.168.187.1';
export const WORKSPACE_ID = __ENV.WORKSPACE_ID || 'f078c38d-736b-442f-980d-5baac530ebc7';

// Test User Credentials
export const DEFAULT_EMAIL = __ENV.EMAIL || 'builder1@testmail.com';
export const DEFAULT_PASSWORD = __ENV.PASSWORD || 'test123';
export const END_USER_EMAIL = __ENV.END_USER_EMAIL || 'enduser@testmail.com';
export const END_USER_PASSWORD = __ENV.END_USER_PASSWORD || 'test123';

// Load Testing Configuration
export const SLEEP_MULTIPLIER = parseFloat(__ENV.SLEEP_MULTIPLIER || '2.5');

// Test Duration Configuration (can be overridden per test)
export const WARMUP_DURATION = __ENV.WARMUP_DURATION || '2m';
export const RAMPUP_DURATION = __ENV.RAMPUP_DURATION || '2m';
export const HOLD_DURATION = __ENV.HOLD_DURATION || '8m';
export const RAMPDOWN_DURATION = __ENV.RAMPDOWN_DURATION || '2m';

// VU Configuration (default values, can be overridden)
export const VUS_AUTH = parseInt(__ENV.VUS_AUTH || '500');
export const VUS_BUILDER = parseInt(__ENV.VUS_BUILDER || '500');
export const VUS_DATASOURCE = parseInt(__ENV.VUS_DATASOURCE || '500');
export const VUS_WORKSPACE = parseInt(__ENV.VUS_WORKSPACE || '500');
export const VUS_ENDUSER = parseInt(__ENV.VUS_ENDUSER || '1000');
export const VUS_ENTERPRISE = parseInt(__ENV.VUS_ENTERPRISE || '500');

// Data Source Configuration
export const POSTGRES_CONFIG = {
  host: __ENV.POSTGRES_HOST || 'localhost',
  port: __ENV.POSTGRES_PORT || '5432',
  database: __ENV.POSTGRES_DB || 'tooljet_test',
  username: __ENV.POSTGRES_USER || 'postgres',
  password: __ENV.POSTGRES_PASSWORD || 'postgres',
};

export const MYSQL_CONFIG = {
  host: __ENV.MYSQL_HOST || 'localhost',
  port: __ENV.MYSQL_PORT || '3306',
  database: __ENV.MYSQL_DB || 'tooljet_test',
  username: __ENV.MYSQL_USER || 'root',
  password: __ENV.MYSQL_PASSWORD || 'mysql',
};

export const REST_API_URL = __ENV.REST_API_URL || 'https://jsonplaceholder.typicode.com';
export const GRAPHQL_URL = __ENV.GRAPHQL_URL || 'https://countries.trevorblades.com';

// Advanced Configuration
export const DEBUG = __ENV.DEBUG === 'true';
export const SAVE_DETAILED_LOGS = __ENV.SAVE_DETAILED_LOGS === 'true';
export const OUTPUT_FORMAT = __ENV.OUTPUT_FORMAT || 'json';

// Timeout Configuration
export const DEFAULT_TIMEOUT = '60s';
export const AUTH_TIMEOUT = '30s';
export const QUERY_TIMEOUT = '90s';

// Standard k6 Options Template
// Use this as a base for test-specific options
export function getDefaultOptions(targetVUs, testName = 'default') {
  return {
    stages: [
      { duration: WARMUP_DURATION, target: Math.floor(targetVUs * 0.2) },  // 20% warm up
      { duration: RAMPUP_DURATION, target: targetVUs },                     // Ramp to target
      { duration: HOLD_DURATION, target: targetVUs },                       // Hold at target
      { duration: RAMPDOWN_DURATION, target: 0 },                           // Cool down
    ],
    thresholds: {
      http_req_duration: ['p(95)<2000'],        // 95% of requests under 2s
      http_req_failed: ['rate<0.001'],          // Less than 0.1% failures
      'http_req_duration{name:login}': ['p(95)<1000'],    // Login under 1s
      'http_req_duration{name:logout}': ['p(95)<500'],    // Logout under 500ms
    },
    tags: {
      test: testName,
    },
  };
}

// Log configuration (helpful for debugging)
if (DEBUG) {
  console.log('=== K6 Load Test Configuration ===');
  console.log(`BASE_URL: ${BASE_URL}`);
  console.log(`WORKSPACE_ID: ${WORKSPACE_ID}`);
  console.log(`SLEEP_MULTIPLIER: ${SLEEP_MULTIPLIER}`);
  console.log(`DEFAULT_TIMEOUT: ${DEFAULT_TIMEOUT}`);
  console.log('==================================');
}
