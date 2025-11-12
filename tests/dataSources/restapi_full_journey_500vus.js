// ===================================================================
// ToolJet Load Test - REST API Full Journey
// Flow: Login → Create App → Add REST API DS → Create Query → Run Query → Delete
// Target: 500 VUs, 10-12 RPS, 0%-0.1% failure rate
// Based on: cypress/e2e/happyPath/marketplace/commonTestcases/data-source/restApiHappyPath.cy.js
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
import {
  getDefaultOptions,
  VUS_DATASOURCE,
  BASE_URL,
  DEFAULT_TIMEOUT,
  QUERY_TIMEOUT,
  RESTAPI_CONFIG
} from '../../common/config.js';

// ===================================================================
// TEST CONFIGURATION
// ===================================================================

export const options = getDefaultOptions(VUS_DATASOURCE, 'restapi_full_journey');

// ===================================================================
// HELPER FUNCTIONS
// ===================================================================

/**
 * Create REST API data source
 */
function createRestApiDataSource(authToken, workspaceId, dsName) {
  const payload = JSON.stringify({
    name: dsName,
    kind: 'restapi',
    options: [
      { key: 'url', value: RESTAPI_CONFIG.url },
      { key: 'auth_type', value: 'none', encrypted: false },
      { key: 'headers', value: [], encrypted: false },
      { key: 'url_params', value: [], encrypted: false },
    ],
    scope: 'global',
  });

  const params = {
    headers: getAuthHeaders(authToken, workspaceId),
    timeout: DEFAULT_TIMEOUT,
    tags: { name: 'create_restapi_ds' },
  };

  const response = http.post(`${BASE_URL}/api/data-sources`, payload, params);
  const success = checkResponse(response, 201, 'create REST API data source');

  let dataSourceId = null;
  if (success) {
    try {
      const body = JSON.parse(response.body);
      dataSourceId = body.id;
    } catch (e) {
      console.error('Failed to parse data source response');
    }
  }

  return { success, dataSourceId };
}

/**
 * Create REST API query
 */
function createRestApiQuery(authToken, workspaceId, appId, versionId, dataSourceId, queryName) {
  const payload = JSON.stringify({
    app_id: appId,
    app_version_id: versionId,
    name: queryName,
    kind: 'restapi',
    options: {
      method: 'GET',
      url: RESTAPI_CONFIG.endpoint || '/users',
      headers: [],
      url_params: [],
      body: [],
      json_body: null,
      body_toggle: false,
      transformationLanguage: 'javascript',
      enableTransformation: false,
    },
    data_source_id: dataSourceId,
    plugin_id: null,
  });

  const params = {
    headers: getAuthHeaders(authToken, workspaceId),
    timeout: DEFAULT_TIMEOUT,
    tags: { name: 'create_restapi_query' },
  };

  const response = http.post(
    `${BASE_URL}/api/data-queries/data-sources/${dataSourceId}/versions/${versionId}`,
    payload,
    params
  );

  const success = checkResponse(response, 201, 'create REST API query');

  let queryId = null;
  if (success) {
    try {
      const body = JSON.parse(response.body);
      queryId = body.id;
    } catch (e) {
      console.error('Failed to parse query response');
    }
  }

  return { success, queryId };
}

/**
 * Run REST API query
 */
function runRestApiQuery(authToken, workspaceId, appId, queryId, versionId, environmentId) {
  const payload = JSON.stringify({});

  const params = {
    headers: getAuthHeaders(authToken, workspaceId, {
      'Cookie': `tj_auth_token=${authToken}; app_id=${appId}`,
    }),
    timeout: QUERY_TIMEOUT,
    tags: { name: 'run_restapi_query' },
  };

  const response = http.post(
    `${BASE_URL}/api/data-queries/${queryId}/versions/${versionId}/run/${environmentId}`,
    payload,
    params
  );

  const success = checkResponse(response, 201, 'run REST API query');

  return { success, response };
}

/**
 * Delete data source
 */
function deleteDataSource(authToken, workspaceId, dataSourceId) {
  const params = {
    headers: getAuthHeaders(authToken, workspaceId),
    timeout: DEFAULT_TIMEOUT,
    tags: { name: 'delete_data_source' },
  };

  const response = http.del(`${BASE_URL}/api/data-sources/${dataSourceId}`, null, params);
  return checkResponse(response, 200, 'delete data source');
}

// ===================================================================
// TEST SCENARIO
// ===================================================================

export default function () {
  let authData;
  let appData;
  let dataSourceId;
  let queryId;

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
  // STEP 2: CREATE APP
  // ===================================================================
  group('Create App', function () {
    const appName = uniqueName('LoadTest-RestAPI');

    appData = createApp(authData.authToken, authData.workspaceId, appName);

    if (!appData.success) {
      console.error('App creation failed, skipping rest of iteration');
      logout(authData.authToken, authData.workspaceId);
      return;
    }

    console.log(`✓ App created: ${appData.appName}`);
  });

  adjustedSleep(5, 3);

  // ===================================================================
  // STEP 3: CREATE REST API DATA SOURCE
  // ===================================================================
  group('Create REST API Data Source', function () {
    const dsName = uniqueName('restapi-ds');

    const dsResult = createRestApiDataSource(
      authData.authToken,
      authData.workspaceId,
      dsName
    );

    if (dsResult.success) {
      dataSourceId = dsResult.dataSourceId;
      console.log(`✓ REST API data source created: ${dsName}`);
    } else {
      console.error('Data source creation failed');
      deleteApp(authData.authToken, authData.workspaceId, appData.appId);
      logout(authData.authToken, authData.workspaceId);
      return;
    }
  });

  adjustedSleep(5, 3);

  // ===================================================================
  // STEP 4: CREATE REST API QUERY
  // ===================================================================
  group('Create REST API Query', function () {
    const queryName = uniqueName('fetch-users');

    const queryResult = createRestApiQuery(
      authData.authToken,
      authData.workspaceId,
      appData.appId,
      appData.editingVersionId,
      dataSourceId,
      queryName
    );

    if (queryResult.success) {
      queryId = queryResult.queryId;
      console.log(`✓ REST API query created: ${queryName}`);
    } else {
      console.error('Query creation failed');
    }
  });

  adjustedSleep(5, 3);

  // ===================================================================
  // STEP 5: RUN REST API QUERY
  // ===================================================================
  group('Run REST API Query', function () {
    if (!queryId) {
      console.error('No query ID available, skipping query execution');
      return;
    }

    const runResult = runRestApiQuery(
      authData.authToken,
      authData.workspaceId,
      appData.appId,
      queryId,
      appData.editingVersionId,
      appData.environmentId
    );

    if (runResult.success) {
      console.log(`✓ REST API query executed successfully`);
    } else {
      console.error('Query execution failed');
    }
  });

  adjustedSleep(10, 5);

  // ===================================================================
  // STEP 6: RUN QUERY AGAIN (Simulating multiple executions)
  // ===================================================================
  group('Run Query Again', function () {
    if (queryId) {
      runRestApiQuery(
        authData.authToken,
        authData.workspaceId,
        appData.appId,
        queryId,
        appData.editingVersionId,
        appData.environmentId
      );
      console.log(`✓ Query re-executed`);
    }
  });

  adjustedSleep(5, 3);

  // ===================================================================
  // STEP 7: RUN QUERY THIRD TIME (Simulate active testing)
  // ===================================================================
  group('Run Query Third Time', function () {
    if (queryId) {
      runRestApiQuery(
        authData.authToken,
        authData.workspaceId,
        appData.appId,
        queryId,
        appData.editingVersionId,
        appData.environmentId
      );
      console.log(`✓ Query executed for third time`);
    }
  });

  adjustedSleep(5, 3);

  // ===================================================================
  // STEP 8: DELETE DATA SOURCE
  // ===================================================================
  group('Delete Data Source', function () {
    if (dataSourceId) {
      const deleteSuccess = deleteDataSource(
        authData.authToken,
        authData.workspaceId,
        dataSourceId
      );

      if (deleteSuccess) {
        console.log(`✓ Data source deleted`);
      }
    }
  });

  adjustedSleep(3, 2);

  // ===================================================================
  // STEP 9: DELETE APP
  // ===================================================================
  group('Delete App', function () {
    deleteApp(authData.authToken, authData.workspaceId, appData.appId);
    console.log(`✓ App deleted: ${appData.appName}`);
  });

  adjustedSleep(3, 2);

  // ===================================================================
  // STEP 10: LOGOUT
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
  console.log('REST API Full Journey Load Test');
  console.log('===================================');
  console.log(`Target VUs: ${VUS_DATASOURCE}`);
  console.log(`Expected RPS: 10-12`);
  console.log(`Failure Rate Target: < 0.1%`);
  console.log('===================================');
  console.log('Journey: Login → Create App → Add REST API → Create Query → Run Query (3x) → Delete');
  console.log('===================================');
  console.log(`REST API Config: ${RESTAPI_CONFIG.url}`);
  console.log('===================================');
}

export function teardown(data) {
  console.log('===================================');
  console.log('Test Complete');
  console.log('===================================');
}
