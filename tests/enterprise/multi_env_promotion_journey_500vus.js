// ===================================================================
// ToolJet Load Test - Multi-Environment Promotion Journey (Enterprise)
// Flow: Login → Create App → Promote Dev → Staging → Production → Release → Delete
// Target: 500 VUs, 5-8 RPS, 0%-0.1% failure rate
// Based on: cypress/e2e/happyPath/platform/eeTestcases/multi-env/multiEnv.cy.js
// Note: Requires Enterprise Edition with multiple environments enabled
// ===================================================================

import { group } from 'k6';
import http from 'k6/http';
import { login, logout, getAuthHeaders } from '../../common/auth.js';
import {
  adjustedSleep,
  createApp,
  deleteApp,
  uniqueName,
  checkResponse,
} from '../../common/helpers.js';
import { getDefaultOptions, VUS_ENTERPRISE, BASE_URL, DEFAULT_TIMEOUT } from '../../common/config.js';

// ===================================================================
// TEST CONFIGURATION
// ===================================================================

export const options = getDefaultOptions(VUS_ENTERPRISE, 'multi_env_promotion');

// ===================================================================
// HELPER FUNCTIONS
// ===================================================================

/**
 * Get all available environments
 */
function getEnvironments(authToken, workspaceId) {
  const params = {
    headers: getAuthHeaders(authToken, workspaceId),
    timeout: DEFAULT_TIMEOUT,
    tags: { name: 'get_environments' },
  };

  const response = http.get(`${BASE_URL}/api/app-environments`, params);
  const success = checkResponse(response, 200, 'get environments');

  let environments = [];
  if (success) {
    try {
      const body = JSON.parse(response.body);
      environments = body.environments || [];
    } catch (e) {
      console.error('Failed to parse environments response');
    }
  }

  return { success, environments };
}

/**
 * Promote app version to next environment
 */
function promoteAppVersion(authToken, workspaceId, appId, fromVersionId, toEnvironmentId) {
  const payload = JSON.stringify({
    version_id: fromVersionId,
    environment_id: toEnvironmentId,
  });

  const params = {
    headers: getAuthHeaders(authToken, workspaceId),
    timeout: DEFAULT_TIMEOUT,
    tags: { name: 'promote_app_version' },
  };

  const response = http.post(
    `${BASE_URL}/api/apps/${appId}/versions/promote`,
    payload,
    params
  );

  const success = checkResponse(response, 201, 'promote app version');

  let promotedVersionId = null;
  if (success) {
    try {
      const body = JSON.parse(response.body);
      promotedVersionId = body.id || body.version_id;
    } catch (e) {
      console.error('Failed to parse promotion response');
    }
  }

  return { success, versionId: promotedVersionId };
}

/**
 * Get app versions
 */
function getAppVersions(authToken, workspaceId, appId) {
  const params = {
    headers: getAuthHeaders(authToken, workspaceId),
    timeout: DEFAULT_TIMEOUT,
    tags: { name: 'get_app_versions' },
  };

  const response = http.get(`${BASE_URL}/api/apps/${appId}/versions`, params);
  const success = checkResponse(response, 200, 'get app versions');

  let versions = [];
  if (success) {
    try {
      const body = JSON.parse(response.body);
      versions = body.versions || [];
    } catch (e) {
      console.error('Failed to parse versions response');
    }
  }

  return { success, versions };
}

/**
 * Release an app version
 */
function releaseAppVersion(authToken, workspaceId, appId, versionId) {
  const payload = JSON.stringify({
    versionId: versionId,
  });

  const params = {
    headers: getAuthHeaders(authToken, workspaceId),
    timeout: DEFAULT_TIMEOUT,
    tags: { name: 'release_app_version' },
  };

  const response = http.post(`${BASE_URL}/api/apps/${appId}/release`, payload, params);
  return checkResponse(response, 200, 'release app version');
}

// ===================================================================
// TEST SCENARIO
// ===================================================================

export default function () {
  let authData;
  let appData;
  let environments;
  let devEnvId, stagingEnvId, productionEnvId;
  let stagingVersionId, productionVersionId;

  // ===================================================================
  // STEP 1: LOGIN
  // ===================================================================
  group('Login', function () {
    authData = login();

    if (!authData.success) {
      console.error('Login failed, skipping iteration');
      return;
    }

    console.log(`✓ Logged in: ${authData.email}`);
  });

  adjustedSleep(3, 2);

  // ===================================================================
  // STEP 2: GET AVAILABLE ENVIRONMENTS
  // ===================================================================
  group('Get Environments', function () {
    const result = getEnvironments(authData.authToken, authData.workspaceId);

    if (result.success) {
      environments = result.environments;
      console.log(`✓ Retrieved ${environments.length} environments`);

      // Find environment IDs by name
      const devEnv = environments.find((env) => env.name === 'development');
      const stagingEnv = environments.find((env) => env.name === 'staging');
      const productionEnv = environments.find((env) => env.name === 'production');

      if (devEnv) devEnvId = devEnv.id;
      if (stagingEnv) stagingEnvId = stagingEnv.id;
      if (productionEnv) productionEnvId = productionEnv.id;

      console.log(`  - Development: ${devEnvId || 'Not found'}`);
      console.log(`  - Staging: ${stagingEnvId || 'Not found'}`);
      console.log(`  - Production: ${productionEnvId || 'Not found'}`);
    }
  });

  adjustedSleep(3, 2);

  // ===================================================================
  // STEP 3: CREATE APP (Starts in Development)
  // ===================================================================
  group('Create App', function () {
    const appName = uniqueName('LoadTest-MultiEnv');

    appData = createApp(authData.authToken, authData.workspaceId, appName);

    if (!appData.success) {
      console.error('App creation failed, skipping rest of iteration');
      logout(authData.authToken, authData.workspaceId);
      return;
    }

    console.log(`✓ App created: ${appData.appName} (in Development)`);
  });

  adjustedSleep(5, 3);

  // ===================================================================
  // STEP 4: GET APP VERSIONS (Verify Development version)
  // ===================================================================
  group('Get App Versions', function () {
    const result = getAppVersions(authData.authToken, authData.workspaceId, appData.appId);

    if (result.success) {
      console.log(`✓ Retrieved ${result.versions.length} version(s)`);
    }
  });

  adjustedSleep(5, 3);

  // ===================================================================
  // STEP 5: PROMOTE TO STAGING
  // ===================================================================
  group('Promote to Staging', function () {
    if (!stagingEnvId) {
      console.error('Staging environment not available (Enterprise feature may not be enabled)');
      return;
    }

    const result = promoteAppVersion(
      authData.authToken,
      authData.workspaceId,
      appData.appId,
      appData.editingVersionId,
      stagingEnvId
    );

    if (result.success) {
      stagingVersionId = result.versionId;
      console.log(`✓ Promoted to Staging environment`);
    } else {
      console.error('Promotion to Staging failed (Enterprise feature may not be enabled)');
    }
  });

  adjustedSleep(10, 5);

  // ===================================================================
  // STEP 6: VERIFY STAGING VERSION
  // ===================================================================
  group('Verify Staging Version', function () {
    const result = getAppVersions(authData.authToken, authData.workspaceId, appData.appId);

    if (result.success) {
      console.log(`✓ App now has ${result.versions.length} version(s)`);
    }
  });

  adjustedSleep(5, 3);

  // ===================================================================
  // STEP 7: PROMOTE TO PRODUCTION
  // ===================================================================
  group('Promote to Production', function () {
    if (!productionEnvId || !stagingVersionId) {
      console.error('Production environment or staging version not available');
      return;
    }

    const result = promoteAppVersion(
      authData.authToken,
      authData.workspaceId,
      appData.appId,
      stagingVersionId,
      productionEnvId
    );

    if (result.success) {
      productionVersionId = result.versionId;
      console.log(`✓ Promoted to Production environment`);
    } else {
      console.error('Promotion to Production failed');
    }
  });

  adjustedSleep(10, 5);

  // ===================================================================
  // STEP 8: VERIFY PRODUCTION VERSION
  // ===================================================================
  group('Verify Production Version', function () {
    const result = getAppVersions(authData.authToken, authData.workspaceId, appData.appId);

    if (result.success) {
      console.log(`✓ App now has ${result.versions.length} version(s) across all environments`);
    }
  });

  adjustedSleep(10, 5);

  // ===================================================================
  // STEP 9: RELEASE PRODUCTION VERSION
  // ===================================================================
  group('Release Production Version', function () {
    if (!productionVersionId) {
      console.error('No production version to release');
      return;
    }

    const success = releaseAppVersion(
      authData.authToken,
      authData.workspaceId,
      appData.appId,
      productionVersionId
    );

    if (success) {
      console.log(`✓ Released production version`);
    }
  });

  adjustedSleep(10, 5);

  // ===================================================================
  // STEP 10: FINAL VERIFICATION
  // ===================================================================
  group('Final Version Check', function () {
    const result = getAppVersions(authData.authToken, authData.workspaceId, appData.appId);

    if (result.success) {
      console.log(`✓ Final state: ${result.versions.length} version(s)`);
    }
  });

  adjustedSleep(5, 3);

  // ===================================================================
  // STEP 11: DELETE APP (Cleanup)
  // ===================================================================
  group('Delete App', function () {
    deleteApp(authData.authToken, authData.workspaceId, appData.appId);
    console.log(`✓ App deleted: ${appData.appName}`);
  });

  adjustedSleep(3, 2);

  // ===================================================================
  // STEP 12: LOGOUT
  // ===================================================================
  group('Logout', function () {
    logout(authData.authToken, authData.workspaceId);
    console.log(`✓ Logged out`);
  });

  // Sleep before next iteration
  adjustedSleep(120, 60); // 5-7.5 min between iterations
}

// ===================================================================
// TEST LIFECYCLE
// ===================================================================

export function setup() {
  console.log('===================================');
  console.log('Multi-Environment Promotion Journey Load Test');
  console.log('===================================');
  console.log(`Target VUs: ${VUS_ENTERPRISE}`);
  console.log(`Expected RPS: 5-8`);
  console.log(`Failure Rate Target: < 0.1%`);
  console.log('===================================');
  console.log('Journey: Login → Create App (Dev) → Promote to Staging → Promote to Production → Release → Delete');
  console.log('===================================');
  console.log('⚠️  NOTE: This test requires ToolJet Enterprise Edition with multi-environment feature enabled');
  console.log('   If you see errors about promotions, check that:');
  console.log('   1. Enterprise Edition is active');
  console.log('   2. Multiple environments are configured (dev, staging, production)');
  console.log('===================================');
}

export function teardown(data) {
  console.log('===================================');
  console.log('Test Complete');
  console.log('===================================');
}
