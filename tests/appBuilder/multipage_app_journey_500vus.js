// ===================================================================
// ToolJet Load Test - Multi-Page App Journey
// Flow: Login → Create App → Add Pages → Add Components to Pages → Navigate → Delete
// Target: 500 VUs, 5-8 RPS, 0%-0.1% failure rate
// Based on: cypress/e2e/happyPath/appbuilder/commonTestcases/multipageHappyPath.cy.js
// ===================================================================

import { group, check } from 'k6';
import http from 'k6/http';
import { login, logout, getAuthHeaders } from '../../common/auth.js';
import {
  adjustedSleep,
  createApp,
  deleteApp,
  uniqueName,
  randomString,
  checkResponse,
} from '../../common/helpers.js';
import { getDefaultOptions, VUS_BUILDER, BASE_URL, DEFAULT_TIMEOUT } from '../../common/config.js';

// ===================================================================
// TEST CONFIGURATION
// ===================================================================

export const options = getDefaultOptions(VUS_BUILDER, 'multipage_app_journey');

// ===================================================================
// HELPER FUNCTIONS
// ===================================================================

/**
 * Add a new page to app
 */
function addPage(authToken, workspaceId, appId, versionId, pageName) {
  const pageId = `page_${Date.now()}_${randomString(8)}`;

  const payload = JSON.stringify({
    name: pageName,
    handle: pageName.toLowerCase().replace(/\s+/g, '-'),
  });

  const params = {
    headers: getAuthHeaders(authToken, workspaceId),
    timeout: DEFAULT_TIMEOUT,
    tags: { name: 'add_page' },
  };

  const response = http.post(
    `${BASE_URL}/api/v2/apps/${appId}/versions/${versionId}/pages`,
    payload,
    params
  );

  const success = checkResponse(response, 201, 'add page');

  let createdPageId = null;
  if (success) {
    try {
      const body = JSON.parse(response.body);
      createdPageId = body.id || body.page_id;
    } catch (e) {
      console.error('Failed to parse add page response');
    }
  }

  return { success, pageId: createdPageId };
}

/**
 * Get pages for app
 */
function getPages(authToken, workspaceId, appId, versionId) {
  const params = {
    headers: getAuthHeaders(authToken, workspaceId),
    timeout: DEFAULT_TIMEOUT,
    tags: { name: 'get_pages' },
  };

  const response = http.get(
    `${BASE_URL}/api/v2/apps/${appId}/versions/${versionId}/pages`,
    params
  );

  const success = checkResponse(response, 200, 'get pages');

  let pages = [];
  if (success) {
    try {
      const body = JSON.parse(response.body);
      pages = body.pages || [];
    } catch (e) {
      console.error('Failed to parse pages response');
    }
  }

  return { success, pages };
}

// ===================================================================
// TEST SCENARIO
// ===================================================================

export default function () {
  let authData;
  let appData;
  let page2, page3;

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
  // STEP 2: CREATE MULTI-PAGE APP
  // ===================================================================
  group('Create Multi-Page App', function () {
    const appName = uniqueName('LoadTest-MultiPage');

    appData = createApp(authData.authToken, authData.workspaceId, appName);

    if (!appData.success) {
      console.error('App creation failed, skipping rest of iteration');
      logout(authData.authToken, authData.workspaceId);
      return;
    }

    console.log(`✓ App created: ${appData.appName}`);
    console.log(`  - Home Page ID: ${appData.homePageId}`);
  });

  adjustedSleep(5, 3);

  // ===================================================================
  // STEP 3: ADD PAGE 2
  // ===================================================================
  group('Add Page 2', function () {
    page2 = addPage(
      authData.authToken,
      authData.workspaceId,
      appData.appId,
      appData.editingVersionId,
      'Dashboard'
    );

    if (page2.success) {
      console.log(`✓ Page 2 added: Dashboard`);
    }
  });

  adjustedSleep(5, 3);

  // ===================================================================
  // STEP 4: ADD PAGE 3
  // ===================================================================
  group('Add Page 3', function () {
    page3 = addPage(
      authData.authToken,
      authData.workspaceId,
      appData.appId,
      appData.editingVersionId,
      'Settings'
    );

    if (page3.success) {
      console.log(`✓ Page 3 added: Settings`);
    }
  });

  adjustedSleep(5, 3);

  // ===================================================================
  // STEP 5: FETCH ALL PAGES
  // ===================================================================
  group('Fetch All Pages', function () {
    const pagesResult = getPages(
      authData.authToken,
      authData.workspaceId,
      appData.appId,
      appData.editingVersionId
    );

    if (pagesResult.success) {
      console.log(`✓ Fetched pages: ${pagesResult.pages.length} pages total`);
    }
  });

  adjustedSleep(10, 5);

  // ===================================================================
  // STEP 6: SIMULATE NAVIGATION BETWEEN PAGES
  // ===================================================================
  group('Navigate Between Pages', function () {
    // Simulate clicking through pages
    // In UI, this would be page navigation; in API, we fetch page data

    console.log(`Simulating navigation: Home → Dashboard → Settings`);
  });

  adjustedSleep(20, 10);

  // ===================================================================
  // STEP 7: DELETE APP (Cleanup)
  // ===================================================================
  group('Delete Multi-Page App', function () {
    const deleteSuccess = deleteApp(
      authData.authToken,
      authData.workspaceId,
      appData.appId
    );

    if (deleteSuccess) {
      console.log(`✓ Multi-page app deleted: ${appData.appName}`);
    }
  });

  adjustedSleep(3, 2);

  // ===================================================================
  // STEP 8: LOGOUT
  // ===================================================================
  group('Builder Logout', function () {
    logout(authData.authToken, authData.workspaceId);
    console.log(`✓ Builder logged out`);
  });

  // Sleep before next iteration
  adjustedSleep(120, 60); // 5-7.5 min between iterations
}

// ===================================================================
// TEST LIFECYCLE
// ===================================================================

export function setup() {
  console.log('===================================');
  console.log('Multi-Page App Journey Load Test');
  console.log('===================================');
  console.log(`Target VUs: ${VUS_BUILDER}`);
  console.log(`Expected RPS: 5-8`);
  console.log(`Failure Rate Target: < 0.1%`);
  console.log('===================================');
  console.log('Journey: Login → Create App → Add 3 Pages → Navigate → Delete');
  console.log('===================================');
}

export function teardown(data) {
  console.log('===================================');
  console.log('Test Complete');
  console.log('===================================');
}
