// ===================================================================
// ToolJet Load Test - Workspace Setup Journey
// Flow: Login → Create Workspace → Switch Workspace → Edit Workspace → Verify → Logout
// Target: 500 VUs, 5-8 RPS, 0%-0.1% failure rate
// Based on: cypress/e2e/happyPath/platform/commonTestcases/workspace/workspace.cy.js
// ===================================================================

import { group } from 'k6';
import http from 'k6/http';
import { login, logout, getAuthHeaders } from '../../common/auth.js';
import {
  adjustedSleep,
  uniqueName,
  randomString,
  checkResponse,
} from '../../common/helpers.js';
import { getDefaultOptions, VUS_WORKSPACE, BASE_URL, DEFAULT_TIMEOUT } from '../../common/config.js';

// ===================================================================
// TEST CONFIGURATION
// ===================================================================

export const options = getDefaultOptions(VUS_WORKSPACE, 'workspace_setup_journey');

// ===================================================================
// HELPER FUNCTIONS
// ===================================================================

/**
 * Create a new workspace (organization)
 */
function createWorkspace(authToken, workspaceId, workspaceName, workspaceSlug) {
  const payload = JSON.stringify({
    name: workspaceName,
    slug: workspaceSlug,
  });

  const params = {
    headers: getAuthHeaders(authToken, workspaceId),
    timeout: DEFAULT_TIMEOUT,
    tags: { name: 'create_workspace' },
  };

  const response = http.post(`${BASE_URL}/api/organizations`, payload, params);
  const success = checkResponse(response, 201, 'create workspace');

  let newWorkspaceId = null;
  if (success) {
    try {
      const body = JSON.parse(response.body);
      newWorkspaceId = body.id;
    } catch (e) {
      console.error('Failed to parse workspace creation response');
    }
  }

  return { success, workspaceId: newWorkspaceId };
}

/**
 * Update workspace (organization)
 */
function updateWorkspace(authToken, currentWorkspaceId, targetWorkspaceId, workspaceName, workspaceSlug) {
  const payload = JSON.stringify({
    name: workspaceName,
    slug: workspaceSlug,
  });

  const params = {
    headers: getAuthHeaders(authToken, currentWorkspaceId),
    timeout: DEFAULT_TIMEOUT,
    tags: { name: 'update_workspace' },
  };

  const response = http.patch(`${BASE_URL}/api/organizations/${targetWorkspaceId}`, payload, params);
  const success = checkResponse(response, 200, 'update workspace');

  return { success };
}

/**
 * Get workspace details
 */
function getWorkspaceDetails(authToken, workspaceId, targetWorkspaceId) {
  const params = {
    headers: getAuthHeaders(authToken, workspaceId),
    timeout: DEFAULT_TIMEOUT,
    tags: { name: 'get_workspace' },
  };

  const response = http.get(`${BASE_URL}/api/organizations/${targetWorkspaceId}`, params);
  const success = checkResponse(response, 200, 'get workspace details');

  let workspace = null;
  if (success) {
    try {
      workspace = JSON.parse(response.body);
    } catch (e) {
      console.error('Failed to parse workspace details response');
    }
  }

  return { success, workspace };
}

/**
 * List all workspaces for current user
 */
function listWorkspaces(authToken, workspaceId) {
  const params = {
    headers: getAuthHeaders(authToken, workspaceId),
    timeout: DEFAULT_TIMEOUT,
    tags: { name: 'list_workspaces' },
  };

  const response = http.get(`${BASE_URL}/api/organizations`, params);
  const success = checkResponse(response, 200, 'list workspaces');

  let workspaces = [];
  if (success) {
    try {
      const body = JSON.parse(response.body);
      workspaces = body.organizations || [];
    } catch (e) {
      console.error('Failed to parse workspaces list response');
    }
  }

  return { success, workspaces };
}

/**
 * Switch to a workspace by authenticating with it
 */
function switchWorkspace(authToken, targetWorkspaceId) {
  const params = {
    headers: {
      'Cookie': `tj_auth_token=${authToken}`,
      'Content-Type': 'application/json',
    },
    timeout: DEFAULT_TIMEOUT,
    tags: { name: 'switch_workspace' },
  };

  const response = http.get(`${BASE_URL}/api/switch/${targetWorkspaceId}`, params);
  const success = checkResponse(response, 200, 'switch workspace');

  return { success };
}

// ===================================================================
// TEST SCENARIO
// ===================================================================

export default function () {
  let authData;
  let newWorkspaceId;
  let workspaceName;
  let workspaceSlug;

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
  // STEP 2: LIST EXISTING WORKSPACES
  // ===================================================================
  group('List Existing Workspaces', function () {
    const result = listWorkspaces(authData.authToken, authData.workspaceId);

    if (result.success) {
      console.log(`✓ Listed ${result.workspaces.length} workspaces`);
    }
  });

  adjustedSleep(5, 3);

  // ===================================================================
  // STEP 3: CREATE NEW WORKSPACE
  // ===================================================================
  group('Create New Workspace', function () {
    workspaceName = uniqueName('LoadTest-Workspace');
    workspaceSlug = `${workspaceName.toLowerCase()}-${randomString(6)}`;

    const result = createWorkspace(
      authData.authToken,
      authData.workspaceId,
      workspaceName,
      workspaceSlug
    );

    if (result.success) {
      newWorkspaceId = result.workspaceId;
      console.log(`✓ Workspace created: ${workspaceName} (slug: ${workspaceSlug})`);
    } else {
      console.error('Workspace creation failed');
      logout(authData.authToken, authData.workspaceId);
      return;
    }
  });

  adjustedSleep(5, 3);

  // ===================================================================
  // STEP 4: SWITCH TO NEW WORKSPACE
  // ===================================================================
  group('Switch to New Workspace', function () {
    if (!newWorkspaceId) {
      console.error('No new workspace ID available');
      return;
    }

    const result = switchWorkspace(authData.authToken, newWorkspaceId);

    if (result.success) {
      console.log(`✓ Switched to new workspace: ${workspaceName}`);
      // Update the current workspace ID for subsequent requests
      authData.workspaceId = newWorkspaceId;
    }
  });

  adjustedSleep(5, 3);

  // ===================================================================
  // STEP 5: VERIFY WORKSPACE DETAILS
  // ===================================================================
  group('Verify Workspace Details', function () {
    if (!newWorkspaceId) {
      console.error('No workspace ID to verify');
      return;
    }

    const result = getWorkspaceDetails(
      authData.authToken,
      newWorkspaceId,
      newWorkspaceId
    );

    if (result.success && result.workspace) {
      console.log(`✓ Workspace verified: ${result.workspace.name}`);
    }
  });

  adjustedSleep(10, 5);

  // ===================================================================
  // STEP 6: EDIT WORKSPACE (Update name and slug)
  // ===================================================================
  group('Edit Workspace', function () {
    if (!newWorkspaceId) {
      console.error('No workspace ID to edit');
      return;
    }

    const updatedName = `${workspaceName}-Updated`;
    const updatedSlug = `${workspaceSlug}-updated`;

    const result = updateWorkspace(
      authData.authToken,
      newWorkspaceId,
      newWorkspaceId,
      updatedName,
      updatedSlug
    );

    if (result.success) {
      console.log(`✓ Workspace updated: ${updatedName}`);
      workspaceName = updatedName;
      workspaceSlug = updatedSlug;
    }
  });

  adjustedSleep(10, 5);

  // ===================================================================
  // STEP 7: VERIFY UPDATED DETAILS
  // ===================================================================
  group('Verify Updated Workspace', function () {
    if (!newWorkspaceId) {
      console.error('No workspace ID to verify');
      return;
    }

    const result = getWorkspaceDetails(
      authData.authToken,
      newWorkspaceId,
      newWorkspaceId
    );

    if (result.success && result.workspace) {
      console.log(`✓ Updated workspace verified: ${result.workspace.name}`);
    }
  });

  adjustedSleep(10, 5);

  // ===================================================================
  // STEP 8: LIST ALL WORKSPACES AGAIN
  // ===================================================================
  group('List All Workspaces Again', function () {
    const result = listWorkspaces(authData.authToken, newWorkspaceId);

    if (result.success) {
      console.log(`✓ Listed ${result.workspaces.length} workspaces (including new one)`);
    }
  });

  adjustedSleep(5, 3);

  // ===================================================================
  // STEP 9: LOGOUT
  // ===================================================================
  group('Logout', function () {
    logout(authData.authToken, newWorkspaceId);
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
  console.log('Workspace Setup Journey Load Test');
  console.log('===================================');
  console.log(`Target VUs: ${VUS_WORKSPACE}`);
  console.log(`Expected RPS: 5-8`);
  console.log(`Failure Rate Target: < 0.1%`);
  console.log('===================================');
  console.log('Journey: Login → List → Create Workspace → Switch → Verify → Edit → Logout');
  console.log('===================================');
}

export function teardown(data) {
  console.log('===================================');
  console.log('Test Complete');
  console.log('===================================');
  console.log('Note: Created workspaces remain for manual cleanup if needed');
}
