// ===================================================================
// ToolJet Load Test - Private App Viewing Journey
// Flow: Login as End User → View Private App → Interact → Logout
// Target: 500 VUs, 8-10 RPS, 0%-0.1% failure rate
// Purpose: Test private apps accessed by authenticated end users
// Based on: App viewing with authentication
// ===================================================================

import { group } from 'k6';
import http from 'k6/http';
import { login, logout, getAuthHeaders } from '../../common/auth.js';
import {
  adjustedSleep,
  createApp,
  releaseApp,
  deleteApp,
  uniqueName,
  checkResponse,
} from '../../common/helpers.js';
import { getDefaultOptions, VUS_ENDUSER, BASE_URL, DEFAULT_TIMEOUT } from '../../common/config.js';

// ===================================================================
// TEST CONFIGURATION
// ===================================================================

export const options = getDefaultOptions(VUS_ENDUSER, 'private_app_viewing');

// ===================================================================
// HELPER FUNCTIONS
// ===================================================================

/**
 * Get app by slug (authenticated)
 */
function getAppBySlug(authToken, workspaceSlug, appSlug) {
  const params = {
    headers: {
      'Cookie': `tj_auth_token=${authToken}`,
      'Content-Type': 'application/json',
    },
    timeout: DEFAULT_TIMEOUT,
    tags: { name: 'get_private_app' },
  };

  const response = http.get(`${BASE_URL}/api/v2/apps/${workspaceSlug}/${appSlug}`, params);
  const success = checkResponse(response, 200, 'get private app by slug');

  let appDetails = null;
  if (success) {
    try {
      appDetails = JSON.parse(response.body);
    } catch (e) {
      console.error('Failed to parse app details');
    }
  }

  return { success, appDetails };
}

/**
 * Get app definition (with auth)
 */
function getAppDefinition(authToken, workspaceSlug, appSlug, versionId) {
  const params = {
    headers: {
      'Cookie': `tj_auth_token=${authToken}`,
      'Content-Type': 'application/json',
    },
    timeout: DEFAULT_TIMEOUT,
    tags: { name: 'get_app_definition' },
  };

  const response = http.get(
    `${BASE_URL}/api/v2/apps/${workspaceSlug}/${appSlug}/${versionId}`,
    params
  );

  const success = checkResponse(response, 200, 'get app definition');

  let definition = null;
  if (success) {
    try {
      definition = JSON.parse(response.body);
    } catch (e) {
      console.error('Failed to parse app definition');
    }
  }

  return { success, definition };
}

/**
 * Update app slug
 */
function updateAppSlug(authToken, workspaceId, appId, newSlug) {
  const payload = JSON.stringify({
    slug: newSlug,
  });

  const params = {
    headers: getAuthHeaders(authToken, workspaceId),
    timeout: DEFAULT_TIMEOUT,
    tags: { name: 'update_app_slug' },
  };

  const response = http.patch(`${BASE_URL}/api/apps/${appId}`, payload, params);
  return checkResponse(response, 200, 'update app slug');
}

/**
 * Make app private (ensure it's not public)
 */
function makeAppPrivate(authToken, workspaceId, appId) {
  const payload = JSON.stringify({
    is_public: false,
  });

  const params = {
    headers: getAuthHeaders(authToken, workspaceId),
    timeout: DEFAULT_TIMEOUT,
    tags: { name: 'make_app_private' },
  };

  const response = http.patch(`${BASE_URL}/api/apps/${appId}`, payload, params);
  return checkResponse(response, 200, 'make app private');
}

// ===================================================================
// SETUP - Create and release a private app
// ===================================================================

export function setup() {
  console.log('===================================');
  console.log('Private App Viewing Load Test - SETUP');
  console.log('===================================');
  console.log('Creating and releasing a private app...');

  // Login as admin
  const authData = login();
  if (!authData.success) {
    throw new Error('Setup failed: Could not login');
  }

  // Create app
  const appName = uniqueName('PrivateApp-LoadTest');
  const appData = createApp(authData.authToken, authData.workspaceId, appName);
  if (!appData.success) {
    throw new Error('Setup failed: Could not create app');
  }

  // Set custom slug
  const customSlug = `loadtest-private-${Date.now()}`;
  updateAppSlug(authData.authToken, authData.workspaceId, appData.appId, customSlug);

  // Ensure app is private
  makeAppPrivate(authData.authToken, authData.workspaceId, appData.appId);

  // Release app
  const releaseResult = releaseApp(authData.authToken, authData.workspaceId, appData.appId, appData.editingVersionId);
  if (!releaseResult.success) {
    throw new Error('Setup failed: Could not release app');
  }

  // Get workspace details
  const wsResponse = http.get(`${BASE_URL}/api/organizations/${authData.workspaceId}`, {
    headers: getAuthHeaders(authData.authToken, authData.workspaceId),
  });

  let workspaceSlug = 'my-workspace';
  if (wsResponse.status === 200) {
    try {
      const wsBody = JSON.parse(wsResponse.body);
      workspaceSlug = wsBody.slug || workspaceSlug;
    } catch (e) {
      console.error('Could not parse workspace details');
    }
  }

  console.log(`✓ Private app created and released`);
  console.log(`  App Name: ${appName}`);
  console.log(`  App Slug: ${customSlug}`);
  console.log(`  Workspace Slug: ${workspaceSlug}`);
  console.log('===================================');
  console.log(`Target VUs: ${VUS_ENDUSER}`);
  console.log(`Expected RPS: 8-10`);
  console.log('===================================');

  // Keep auth data for teardown
  return {
    appId: appData.appId,
    appSlug: customSlug,
    workspaceId: authData.workspaceId,
    workspaceSlug: workspaceSlug,
    adminAuthToken: authData.authToken,
    releasedVersionId: releaseResult.versionId,
  };
}

// ===================================================================
// TEST SCENARIO - End users viewing private app (requires auth)
// ===================================================================

export default function (data) {
  if (!data || !data.appSlug) {
    console.error('No app data available from setup');
    return;
  }

  let authData;

  // ===================================================================
  // STEP 1: LOGIN AS END USER
  // ===================================================================
  group('End User Login', function () {
    authData = login();

    if (!authData.success) {
      console.error('Login failed, skipping iteration');
      return;
    }

    console.log(`✓ End user logged in: ${authData.email}`);
  });

  adjustedSleep(3, 2);

  // ===================================================================
  // STEP 2: ACCESS PRIVATE APP
  // ===================================================================
  group('Access Private App', function () {
    const result = getAppBySlug(authData.authToken, data.workspaceSlug, data.appSlug);

    if (result.success) {
      console.log(`✓ Accessed private app: ${data.appSlug}`);
    } else {
      console.error('Failed to access private app');
    }
  });

  adjustedSleep(5, 3);

  // ===================================================================
  // STEP 3: LOAD APP DEFINITION
  // ===================================================================
  group('Load App Definition', function () {
    if (data.releasedVersionId) {
      const result = getAppDefinition(
        authData.authToken,
        data.workspaceSlug,
        data.appSlug,
        data.releasedVersionId
      );

      if (result.success) {
        console.log(`✓ Loaded app definition`);
      }
    }
  });

  adjustedSleep(10, 5);

  // ===================================================================
  // STEP 4: SIMULATE USER INTERACTION
  // ===================================================================
  group('Simulate User Interaction', function () {
    // Simulate interacting with app components
    console.log(`Simulating user interaction with private app`);
  });

  adjustedSleep(20, 10);

  // ===================================================================
  // STEP 5: RELOAD APP
  // ===================================================================
  group('Reload App', function () {
    const result = getAppBySlug(authData.authToken, data.workspaceSlug, data.appSlug);

    if (result.success) {
      console.log(`✓ Reloaded app`);
    }
  });

  adjustedSleep(10, 5);

  // ===================================================================
  // STEP 6: LOAD DEFINITION AGAIN
  // ===================================================================
  group('Load Definition Again', function () {
    if (data.releasedVersionId) {
      getAppDefinition(
        authData.authToken,
        data.workspaceSlug,
        data.appSlug,
        data.releasedVersionId
      );
      console.log(`✓ Reloaded app definition`);
    }
  });

  adjustedSleep(15, 10);

  // ===================================================================
  // STEP 7: LOGOUT
  // ===================================================================
  group('End User Logout', function () {
    logout(authData.authToken, authData.workspaceId);
    console.log(`✓ End user logged out`);
  });

  // Sleep before next iteration
  adjustedSleep(120, 60); // 5-7.5 min between iterations
}

// ===================================================================
// TEARDOWN - Cleanup
// ===================================================================

export function teardown(data) {
  console.log('===================================');
  console.log('Private App Viewing Test - TEARDOWN');
  console.log('===================================');

  if (data && data.appId && data.adminAuthToken && data.workspaceId) {
    console.log('Cleaning up test app...');
    deleteApp(data.adminAuthToken, data.workspaceId, data.appId);
    logout(data.adminAuthToken, data.workspaceId);
    console.log('✓ Test app deleted');
  }

  console.log('===================================');
  console.log('Test Complete');
  console.log('===================================');
}
