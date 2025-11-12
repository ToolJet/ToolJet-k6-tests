// ===================================================================
// ToolJet Load Test - MySQL Full Journey
// Flow: Login → Create App → Add MySQL DS → Create Query → Run Query → Delete
// Target: 500 VUs, 8-10 RPS, 0%-0.1% failure rate
// Based on: cypress/e2e/happyPath/marketplace/commonTestcases/data-source/mysqlHappyPath.cy.js
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
  MYSQL_CONFIG
} from '../../common/config.js';

// ===================================================================
// TEST CONFIGURATION
// ===================================================================

export const options = getDefaultOptions(VUS_DATASOURCE, 'mysql_full_journey');

// ===================================================================
// HELPER FUNCTIONS
// ===================================================================

function createMySQLDataSource(authToken, workspaceId, dsName) {
  const payload = JSON.stringify({
    name: dsName,
    kind: 'mysql',
    options: [
      { key: 'host', value: MYSQL_CONFIG.host },
      { key: 'port', value: MYSQL_CONFIG.port },
      { key: 'database', value: MYSQL_CONFIG.database },
      { key: 'username', value: MYSQL_CONFIG.username },
      { key: 'password', value: MYSQL_CONFIG.password, encrypted: true },
      { key: 'ssl_enabled', value: false, encrypted: false },
      { key: 'ssl_certificate', value: 'none', encrypted: false },
    ],
    scope: 'global',
  });

  const params = {
    headers: getAuthHeaders(authToken, workspaceId),
    timeout: DEFAULT_TIMEOUT,
    tags: { name: 'create_mysql_ds' },
  };

  const response = http.post(`${BASE_URL}/api/data-sources`, payload, params);
  const success = checkResponse(response, 201, 'create MySQL data source');

  let dataSourceId = null;
  if (success) {
    try {
      dataSourceId = JSON.parse(response.body).id;
    } catch (e) {
      console.error('Failed to parse data source response');
    }
  }

  return { success, dataSourceId };
}

function createQuery(authToken, workspaceId, appId, versionId, dataSourceId, queryName, sqlQuery) {
  const payload = JSON.stringify({
    app_id: appId,
    app_version_id: versionId,
    name: queryName,
    kind: 'mysql',
    options: {
      mode: 'sql',
      query: sqlQuery,
      transformationLanguage: 'javascript',
      enableTransformation: false,
    },
    data_source_id: dataSourceId,
    plugin_id: null,
  });

  const params = {
    headers: getAuthHeaders(authToken, workspaceId),
    timeout: DEFAULT_TIMEOUT,
    tags: { name: 'create_query' },
  };

  const response = http.post(
    `${BASE_URL}/api/data-queries/data-sources/${dataSourceId}/versions/${versionId}`,
    payload,
    params
  );

  const success = checkResponse(response, 201, 'create query');

  let queryId = null;
  if (success) {
    try {
      queryId = JSON.parse(response.body).id;
    } catch (e) {
      console.error('Failed to parse query response');
    }
  }

  return { success, queryId };
}

function runQuery(authToken, workspaceId, appId, queryId, versionId, environmentId) {
  const params = {
    headers: getAuthHeaders(authToken, workspaceId, {
      'Cookie': `tj_auth_token=${authToken}; app_id=${appId}`,
    }),
    timeout: QUERY_TIMEOUT,
    tags: { name: 'run_query' },
  };

  const response = http.post(
    `${BASE_URL}/api/data-queries/${queryId}/versions/${versionId}/run/${environmentId}`,
    JSON.stringify({}),
    params
  );

  return checkResponse(response, 201, 'run query');
}

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

  // Login
  group('Builder Login', function () {
    authData = login();
    if (!authData.success) {
      console.error('Login failed');
      return;
    }
    console.log(`✓ Logged in: ${authData.email}`);
  });

  adjustedSleep(3, 2);

  // Create App
  group('Create App', function () {
    appData = createApp(authData.authToken, authData.workspaceId, uniqueName('LoadTest-MySQL'));
    if (!appData.success) {
      console.error('App creation failed');
      logout(authData.authToken, authData.workspaceId);
      return;
    }
    console.log(`✓ App created: ${appData.appName}`);
  });

  adjustedSleep(5, 3);

  // Create MySQL Data Source
  group('Create MySQL Data Source', function () {
    const dsResult = createMySQLDataSource(authData.authToken, authData.workspaceId, uniqueName('mysql-ds'));
    if (dsResult.success) {
      dataSourceId = dsResult.dataSourceId;
      console.log(`✓ MySQL data source created`);
    } else {
      console.error('Data source creation failed');
      deleteApp(authData.authToken, authData.workspaceId, appData.appId);
      logout(authData.authToken, authData.workspaceId);
      return;
    }
  });

  adjustedSleep(5, 3);

  // Create Query
  group('Create Data Query', function () {
    const queryResult = createQuery(
      authData.authToken,
      authData.workspaceId,
      appData.appId,
      appData.editingVersionId,
      dataSourceId,
      uniqueName('mysql-query'),
      'SELECT 1 as test_value;'
    );

    if (queryResult.success) {
      queryId = queryResult.queryId;
      console.log(`✓ Query created`);
    }
  });

  adjustedSleep(5, 3);

  // Run Query
  group('Run Query', function () {
    if (queryId) {
      const runSuccess = runQuery(
        authData.authToken,
        authData.workspaceId,
        appData.appId,
        queryId,
        appData.editingVersionId,
        appData.environmentId
      );
      if (runSuccess) {
        console.log(`✓ Query executed`);
      }
    }
  });

  adjustedSleep(10, 5);

  // Run Query Again
  group('Run Query Again', function () {
    if (queryId) {
      runQuery(authData.authToken, authData.workspaceId, appData.appId, queryId, appData.editingVersionId, appData.environmentId);
      console.log(`✓ Query re-executed`);
    }
  });

  adjustedSleep(5, 3);

  // Cleanup
  group('Delete Data Source', function () {
    if (dataSourceId) {
      deleteDataSource(authData.authToken, authData.workspaceId, dataSourceId);
      console.log(`✓ Data source deleted`);
    }
  });

  adjustedSleep(3, 2);

  group('Delete App', function () {
    deleteApp(authData.authToken, authData.workspaceId, appData.appId);
    console.log(`✓ App deleted`);
  });

  adjustedSleep(3, 2);

  group('Logout', function () {
    logout(authData.authToken, authData.workspaceId);
    console.log(`✓ Logged out`);
  });

  adjustedSleep(120, 60);
}

export function setup() {
  console.log('===================================');
  console.log('MySQL Full Journey Load Test');
  console.log('===================================');
  console.log(`Target VUs: ${VUS_DATASOURCE}`);
  console.log(`Expected RPS: 8-10`);
  console.log(`MySQL Config: ${MYSQL_CONFIG.host}:${MYSQL_CONFIG.port}/${MYSQL_CONFIG.database}`);
  console.log('===================================');
}

export function teardown(data) {
  console.log('===================================');
  console.log('Test Complete');
  console.log('===================================');
}
