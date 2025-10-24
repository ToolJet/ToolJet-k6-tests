// ===================================================================
// ToolJet Load Test - Public App Viewing Journey
// Flow: Create & Release App → View App (Public) → Interact with Components
// Target: 1000 VUs, 15-20 RPS, 0%-0.1% failure rate
// Purpose: Test public-facing apps with high concurrent viewers (end users)
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
import { getDefaultOptions, BASE_URL, DEFAULT_TIMEOUT } from '../../common/config.js';

// ===================================================================
// TEST CONFIGURATION
// ===================================================================

const VUS_END_USER = 1000;
export const options = getDefaultOptions(VUS_END_USER, 'public_app_viewing');

// ===================================================================
// HELPER FUNCTIONS
// ===================================================================

/**
 * Get app by slug (public access)
 */
function getAppBySlug(workspaceSlug, appSlug, authToken = null) {
  const headers = authToken
    ? { 'Cookie': `tj_auth_token=${authToken}`, 'Content-Type': 'application/json' }
    : { 'Content-Type': 'application/json' };

  const params = {
    headers: headers,
    timeout: DEFAULT_TIMEOUT,
    tags: { name: 'get_app_by_slug' },
  };

  const response = http.get(`${BASE_URL}/api/v2/apps/${workspaceSlug}/${appSlug}`, params);
  const success = checkResponse(response, 200, 'get app by slug');

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
 * Get public app definition (released version)
 */
function getPublicAppDefinition(workspaceSlug, appSlug, versionId) {
  const params = {
    headers: { 'Content-Type': 'application/json' },
    timeout: DEFAULT_TIMEOUT,
    tags: { name: 'get_public_app_definition' },
  };

  const response = http.get(
    `${BASE_URL}/api/v2/apps/${workspaceSlug}/${appSlug}/${versionId}`,
    params
  );

  const success = checkResponse(response, 200, 'get public app definition');

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
 * Make app public
 */
function makeAppPublic(authToken, workspaceId, appId) {
  const payload = JSON.stringify({
    is_public: true,
  });

  const params = {
    headers: getAuthHeaders(authToken, workspaceId),
    timeout: DEFAULT_TIMEOUT,
    tags: { name: 'make_app_public' },
  };

  const response = http.patch(`${BASE_URL}/api/apps/${appId}`, payload, params);
  return checkResponse(response, 200, 'make app public');
}

// ===================================================================
// SETUP - Create and release a shared public app
// ===================================================================

let sharedAppData = null;

export function setup() {
  console.log('===================================');
  console.log('Public App Viewing Load Test - SETUP');
  console.log('===================================');
  console.log('Creating and releasing a public app for all VUs to access...');

  // Login as admin
  const authData = login();
  if (!authData.success) {
    throw new Error('Setup failed: Could not login');
  }

  // Create app
  const appName = uniqueName('PublicApp-LoadTest');
  const appData = createApp(authData.authToken, authData.workspaceId, appName);
  if (!appData.success) {
    throw new Error('Setup failed: Could not create app');
  }

  // Set custom slug
  const customSlug = `loadtest-public-${Date.now()}`;
  updateAppSlug(authData.authToken, authData.workspaceId, appData.appId, customSlug);

  // Make app public
  makeAppPublic(authData.authToken, authData.workspaceId, appData.appId);

  // Release app
  const releaseResult = releaseApp(authData.authToken, authData.workspaceId, appData.appId, appData.editingVersionId);
  if (!releaseResult.success) {
    throw new Error('Setup failed: Could not release app');
  }

  // Get workspace details to find workspace slug
  const wsResponse = http.get(`${BASE_URL}/api/organizations/${authData.workspaceId}`, {
    headers: getAuthHeaders(authData.authToken, authData.workspaceId),
  });

  let workspaceSlug = 'my-workspace'; // default fallback
  if (wsResponse.status === 200) {
    try {
      const wsBody = JSON.parse(wsResponse.body);
      workspaceSlug = wsBody.slug || workspaceSlug;
    } catch (e) {
      console.error('Could not parse workspace details');
    }
  }

  console.log(`✓ Public app created and released`);
  console.log(`  App Name: ${appName}`);
  console.log(`  App Slug: ${customSlug}`);
  console.log(`  Workspace Slug: ${workspaceSlug}`);
  console.log(`  Released Version: ${releaseResult.versionId || 'N/A'}`);
  console.log('===================================');
  console.log(`Target VUs: ${VUS_END_USER}`);
  console.log(`Expected RPS: 15-20`);
  console.log('===================================');

  return {
    appId: appData.appId,
    appSlug: customSlug,
    workspaceId: authData.workspaceId,
    workspaceSlug: workspaceSlug,
    authToken: authData.authToken,
    releasedVersionId: releaseResult.versionId,
  };
}

// ===================================================================
// TEST SCENARIO - Multiple end users viewing the public app
// ===================================================================

export default function (data) {
  if (!data || !data.appSlug) {
    console.error('No app data available from setup');
    return;
  }

  // ===================================================================
  // STEP 1: ACCESS PUBLIC APP (No login required)
  // ===================================================================
  group('Access Public App', function () {
    const result = getAppBySlug(data.workspaceSlug, data.appSlug);

    if (result.success) {
      console.log(`✓ Accessed public app: ${data.appSlug}`);
    } else {
      console.error('Failed to access public app');
    }
  });

  adjustedSleep(5, 3);

  // ===================================================================
  // STEP 2: LOAD APP DEFINITION (Components, queries, etc.)
  // ===================================================================
  group('Load App Definition', function () {
    if (data.releasedVersionId) {
      const result = getPublicAppDefinition(
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
  // STEP 3: SIMULATE USER INTERACTION (Viewing different parts)
  // ===================================================================
  group('Simulate User Interaction', function () {
    // Simulate multiple page views or interactions
    // In a real scenario, this would be clicking buttons, loading data, etc.
    console.log(`Simulating user interaction with app`);
  });

  adjustedSleep(20, 10);

  // ===================================================================
  // STEP 4: REFRESH APP VIEW
  // ===================================================================
  group('Refresh App View', function () {
    const result = getAppBySlug(data.workspaceSlug, data.appSlug);

    if (result.success) {
      console.log(`✓ Refreshed app view`);
    }
  });

  adjustedSleep(15, 10);

  // Sleep before next iteration (simulate user staying on app)
  adjustedSleep(60, 30); // 2.5-3.75 min between iterations
}

// ===================================================================
// TEARDOWN - Cleanup
// ===================================================================

export function teardown(data) {
  console.log('===================================');
  console.log('Public App Viewing Test - TEARDOWN');
  console.log('===================================');

  if (data && data.appId && data.authToken && data.workspaceId) {
    console.log('Cleaning up test app...');
    deleteApp(data.authToken, data.workspaceId, data.appId);
    logout(data.authToken, data.workspaceId);
    console.log('✓ Test app deleted');
  }

  console.log('===================================');
  console.log('Test Complete');
  console.log('===================================');
}
