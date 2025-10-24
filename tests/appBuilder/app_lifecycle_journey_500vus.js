// ===================================================================
// ToolJet Load Test - App Lifecycle Journey
// Complete flow: Login → Create App → Edit → Release → Delete → Logout
// Target: 500 VUs, 8-10 RPS, 0%-0.1% failure rate
// Based on: cypress/e2e/happyPath/platform/commonTestcases/workspace/appCreate.cy.js
// ===================================================================

import { group } from 'k6';
import { login, logout } from '../../common/auth.js';
import {
  adjustedSleep,
  createApp,
  getApp,
  releaseApp,
  deleteApp,
  uniqueName,
} from '../../common/helpers.js';
import { getDefaultOptions, VUS_BUILDER } from '../../common/config.js';

// ===================================================================
// TEST CONFIGURATION
// ===================================================================

export const options = getDefaultOptions(VUS_BUILDER, 'app_lifecycle_journey');

// ===================================================================
// TEST SCENARIO
// ===================================================================

export default function () {
  let authData;
  let appData;

  // ===================================================================
  // STEP 1: LOGIN AS BUILDER
  // ===================================================================
  group('Builder Login', function () {
    authData = login();

    if (!authData.success) {
      console.error('Login failed, skipping iteration');
      return;
    }

    console.log(`✓ Builder logged in: ${authData.email}`);
  });

  adjustedSleep(3, 2);

  // ===================================================================
  // STEP 2: CREATE NEW APP
  // ===================================================================
  group('Create App', function () {
    const appName = uniqueName('LoadTest-App');

    appData = createApp(authData.authToken, authData.workspaceId, appName);

    if (!appData.success) {
      console.error('App creation failed, skipping rest of iteration');
      logout(authData.authToken, authData.workspaceId);
      return;
    }

    console.log(`✓ App created: ${appData.appName} (ID: ${appData.appId})`);
  });

  // Simulate time spent setting up app
  adjustedSleep(10, 5);

  // ===================================================================
  // STEP 3: FETCH APP DETAILS (simulating opening app for editing)
  // ===================================================================
  group('Open App for Editing', function () {
    const fetchedApp = getApp(authData.authToken, authData.workspaceId, appData.appId);

    if (fetchedApp.success) {
      console.log(`✓ App opened for editing: ${fetchedApp.appName}`);
      console.log(`  - Editing Version: ${fetchedApp.editingVersionId}`);
      console.log(`  - Environment: ${fetchedApp.environmentId}`);
    } else {
      console.error('Failed to fetch app details');
    }
  });

  // Simulate time spent editing (adding components, configuring, etc.)
  adjustedSleep(30, 20); // 30-50s * 2.5 = 75-125s

  // ===================================================================
  // STEP 4: RELEASE APP
  // ===================================================================
  group('Release App', function () {
    if (appData.editingVersionId) {
      const releaseSuccess = releaseApp(
        authData.authToken,
        authData.workspaceId,
        appData.appId,
        appData.editingVersionId
      );

      if (releaseSuccess) {
        console.log(`✓ App released successfully`);
      } else {
        console.error('App release failed');
      }
    } else {
      console.error('No editing version ID available for release');
    }
  });

  adjustedSleep(5, 3);

  // ===================================================================
  // STEP 5: VERIFY APP AFTER RELEASE
  // ===================================================================
  group('Verify Released App', function () {
    const verifyApp = getApp(authData.authToken, authData.workspaceId, appData.appId);

    if (verifyApp.success) {
      console.log(`✓ App verified after release`);
    }
  });

  adjustedSleep(10, 5);

  // ===================================================================
  // STEP 6: DELETE APP (Cleanup)
  // ===================================================================
  group('Delete App', function () {
    const deleteSuccess = deleteApp(
      authData.authToken,
      authData.workspaceId,
      appData.appId
    );

    if (deleteSuccess) {
      console.log(`✓ App deleted: ${appData.appName}`);
    } else {
      console.error('App deletion failed');
    }
  });

  adjustedSleep(3, 2);

  // ===================================================================
  // STEP 7: LOGOUT
  // ===================================================================
  group('Builder Logout', function () {
    const logoutSuccess = logout(authData.authToken, authData.workspaceId);

    if (logoutSuccess) {
      console.log(`✓ Builder logged out`);
    }
  });

  // Sleep before next iteration
  adjustedSleep(120, 60); // 5-7.5 min between iterations
}

// ===================================================================
// TEST LIFECYCLE
// ===================================================================

export function setup() {
  console.log('===================================');
  console.log('App Lifecycle Journey Load Test');
  console.log('===================================');
  console.log(`Target VUs: ${VUS_BUILDER}`);
  console.log(`Expected RPS: 8-10`);
  console.log(`Failure Rate Target: < 0.1%`);
  console.log('===================================');
  console.log('Journey: Login → Create → Edit → Release → Delete → Logout');
  console.log('===================================');
}

export function teardown(data) {
  console.log('===================================');
  console.log('Test Complete');
  console.log('===================================');
  console.log('All apps created during test should be deleted');
  console.log('===================================');
}
