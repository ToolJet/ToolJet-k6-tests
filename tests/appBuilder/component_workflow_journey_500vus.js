// ===================================================================
// ToolJet Load Test - Component Workflow Journey
// Flow: Login → Create App → Add Table Component → Add Button → Configure → Delete
// Target: 500 VUs, 6-8 RPS, 0%-0.1% failure rate
// Based on: cypress/e2e/happyPath/appbuilder/commonTestcases/tableHappyPath.cy.js
//           cypress/e2e/happyPath/appbuilder/commonTestcases/buttonHappyPath.cy.js
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

export const options = getDefaultOptions(VUS_BUILDER, 'component_workflow_journey');

// ===================================================================
// HELPER FUNCTIONS
// ===================================================================

/**
 * Add component to app
 */
function addComponent(authToken, workspaceId, appId, versionId, homePageId, componentType, componentName, properties = {}) {
  const componentId = `${Date.now()}_${randomString(8)}`;

  const payload = JSON.stringify({
    is_user_switched_version: false,
    pageId: homePageId,
    diff: {
      [componentId]: {
        name: componentName,
        layouts: {
          desktop: { top: 90, left: 9, width: 6, height: 40 },
          mobile: { top: 90, left: 9, width: 6, height: 40 },
        },
        type: componentType,
        properties: properties,
      },
    },
  });

  const params = {
    headers: getAuthHeaders(authToken, workspaceId),
    timeout: DEFAULT_TIMEOUT,
    tags: { name: 'add_component' },
  };

  const response = http.post(
    `${BASE_URL}/api/v2/apps/${appId}/versions/${versionId}/components`,
    payload,
    params
  );

  const success = checkResponse(response, 201, `add ${componentType} component`);

  return { success, componentId };
}

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
    const appName = uniqueName('LoadTest-Components');

    appData = createApp(authData.authToken, authData.workspaceId, appName);

    if (!appData.success) {
      console.error('App creation failed, skipping rest of iteration');
      logout(authData.authToken, authData.workspaceId);
      return;
    }

    console.log(`✓ App created: ${appData.appName} (ID: ${appData.appId})`);
    console.log(`  - Home Page ID: ${appData.homePageId}`);
    console.log(`  - Version ID: ${appData.editingVersionId}`);
  });

  adjustedSleep(5, 3);

  // ===================================================================
  // STEP 3: ADD TABLE COMPONENT
  // ===================================================================
  group('Add Table Component', function () {
    if (!appData.homePageId || !appData.editingVersionId) {
      console.error('Missing page or version ID');
      return;
    }

    const tableProperties = {
      title: { value: 'Load Test Table' },
      data: { value: '{{[]}}' },
    };

    const tableResult = addComponent(
      authData.authToken,
      authData.workspaceId,
      appData.appId,
      appData.editingVersionId,
      appData.homePageId,
      'Table',
      `table_${randomString(6)}`,
      tableProperties
    );

    if (tableResult.success) {
      console.log(`✓ Table component added`);
    }
  });

  // Simulate time spent configuring table
  adjustedSleep(15, 10);

  // ===================================================================
  // STEP 4: ADD BUTTON COMPONENT
  // ===================================================================
  group('Add Button Component', function () {
    const buttonProperties = {
      text: { value: 'Load Test Button' },
    };

    const buttonResult = addComponent(
      authData.authToken,
      authData.workspaceId,
      appData.appId,
      appData.editingVersionId,
      appData.homePageId,
      'Button',
      `button_${randomString(6)}`,
      buttonProperties
    );

    if (buttonResult.success) {
      console.log(`✓ Button component added`);
    }
  });

  // Simulate time spent configuring button and adding event handlers
  adjustedSleep(10, 5);

  // ===================================================================
  // STEP 5: ADD TEXT COMPONENT
  // ===================================================================
  group('Add Text Component', function () {
    const textProperties = {
      text: { value: 'This is a load test component' },
    };

    const textResult = addComponent(
      authData.authToken,
      authData.workspaceId,
      appData.appId,
      appData.editingVersionId,
      appData.homePageId,
      'Text',
      `text_${randomString(6)}`,
      textProperties
    );

    if (textResult.success) {
      console.log(`✓ Text component added`);
    }
  });

  // Simulate time spent arranging components and testing
  adjustedSleep(20, 10);

  // ===================================================================
  // STEP 6: DELETE APP (Cleanup)
  // ===================================================================
  group('Delete App with Components', function () {
    const deleteSuccess = deleteApp(
      authData.authToken,
      authData.workspaceId,
      appData.appId
    );

    if (deleteSuccess) {
      console.log(`✓ App deleted: ${appData.appName}`);
    }
  });

  adjustedSleep(3, 2);

  // ===================================================================
  // STEP 7: LOGOUT
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
  console.log('Component Workflow Journey Load Test');
  console.log('===================================');
  console.log(`Target VUs: ${VUS_BUILDER}`);
  console.log(`Expected RPS: 6-8`);
  console.log(`Failure Rate Target: < 0.1%`);
  console.log('===================================');
  console.log('Journey: Login → Create App → Add Components → Configure → Delete');
  console.log('Components: Table, Button, Text');
  console.log('===================================');
}

export function teardown(data) {
  console.log('===================================');
  console.log('Test Complete');
  console.log('===================================');
}
