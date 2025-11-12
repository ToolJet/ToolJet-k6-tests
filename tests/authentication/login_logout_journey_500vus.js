// ===================================================================
// ToolJet Load Test - Login/Logout Journey
// Complete user authentication flow with session validation
// Target: 500 VUs, 8-10 RPS, 0%-0.1% failure rate
// Based on: cypress/e2e/happyPath/platform/commonTestcases/userManagment/Login.cy.js
// ===================================================================

import { group } from 'k6';
import { login, logout, verifySession } from '../../common/auth.js';
import { adjustedSleep, listApps } from '../../common/helpers.js';
import { getDefaultOptions, VUS_AUTH } from '../../common/config.js';

// ===================================================================
// TEST CONFIGURATION
// ===================================================================

export const options = getDefaultOptions(VUS_AUTH, 'login_logout_journey');

// ===================================================================
// TEST SCENARIO
// ===================================================================

export default function () {
  let authData;

  // ===================================================================
  // STEP 1: LOGIN
  // ===================================================================
  group('User Login', function () {
    authData = login();

    if (!authData.success) {
      console.error('Login failed, skipping rest of iteration');
      return;
    }

    console.log(`✓ User logged in: ${authData.email}`);
  });

  // Sleep after login to simulate user reading/thinking time
  adjustedSleep(5, 3); // 5-8s * 2.5 = 12.5-20s

  // ===================================================================
  // STEP 2: VERIFY SESSION
  // ===================================================================
  group('Verify Session', function () {
    const sessionValid = verifySession(authData.authToken, authData.workspaceId);

    if (!sessionValid) {
      console.error('Session verification failed');
    }
  });

  adjustedSleep(3, 2); // 3-5s * 2.5 = 7.5-12.5s

  // ===================================================================
  // STEP 3: FETCH APPS (Simulating dashboard view)
  // ===================================================================
  group('List Apps', function () {
    const appsResult = listApps(authData.authToken, authData.workspaceId, 1);

    if (appsResult.success) {
      console.log(`✓ Listed apps: ${appsResult.totalCount} total apps`);
    }
  });

  // Sleep to simulate user browsing dashboard
  adjustedSleep(30, 20); // 30-50s * 2.5 = 75-125s

  // ===================================================================
  // STEP 4: LOGOUT
  // ===================================================================
  group('User Logout', function () {
    const logoutSuccess = logout(authData.authToken, authData.workspaceId);

    if (logoutSuccess) {
      console.log(`✓ User logged out successfully`);
    }
  });

  // Sleep before next iteration (simulating user returning later)
  adjustedSleep(120, 60); // 120-180s * 2.5 = 300-450s (5-7.5 min)
}

// ===================================================================
// TEST LIFECYCLE
// ===================================================================

export function setup() {
  console.log('===================================');
  console.log('Login/Logout Journey Load Test');
  console.log('===================================');
  console.log(`Target VUs: ${VUS_AUTH}`);
  console.log(`Expected RPS: 8-10`);
  console.log(`Failure Rate Target: < 0.1%`);
  console.log('===================================');
}

export function teardown(data) {
  console.log('===================================');
  console.log('Test Complete');
  console.log('===================================');
}
