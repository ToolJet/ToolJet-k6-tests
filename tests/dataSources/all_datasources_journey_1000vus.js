// ===================================================================
// ToolJet Load Test - All Data Sources Mixed Journey
// Flow: Login → Create App → Add Multiple DS (PostgreSQL, MySQL, REST API) → Create Queries → Run Queries → Delete
// Target: 1000 VUs, 15-18 RPS, 0%-0.1% failure rate
// Based on: Mixed operations across all data source happy path tests
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
  BASE_URL,
  DEFAULT_TIMEOUT,
  QUERY_TIMEOUT,
  POSTGRES_CONFIG,
  MYSQL_CONFIG,
  RESTAPI_CONFIG
} from '../../common/config.js';

// ===================================================================
// TEST CONFIGURATION
// ===================================================================

const VUS_MIXED = 1000;
export const options = getDefaultOptions(VUS_MIXED, 'all_datasources_journey');

// ===================================================================
// HELPER FUNCTIONS
// ===================================================================

/**
 * Create a data source (generic function)
 */
function createDataSource(authToken, workspaceId, dsName, kind, options) {
  const payload = JSON.stringify({
    name: dsName,
    kind: kind,
    options: options,
    scope: 'global',
  });

  const params = {
    headers: getAuthHeaders(authToken, workspaceId),
    timeout: DEFAULT_TIMEOUT,
    tags: { name: `create_${kind}_ds` },
  };

  const response = http.post(`${BASE_URL}/api/data-sources`, payload, params);
  const success = checkResponse(response, 201, `create ${kind} data source`);

  let dataSourceId = null;
  if (success) {
    try {
      const body = JSON.parse(response.body);
      dataSourceId = body.id;
    } catch (e) {
      console.error(`Failed to parse ${kind} data source response`);
    }
  }

  return { success, dataSourceId };
}

/**
 * Create a data query (generic function)
 */
function createQuery(authToken, workspaceId, appId, versionId, dataSourceId, queryName, kind, queryOptions) {
  const payload = JSON.stringify({
    app_id: appId,
    app_version_id: versionId,
    name: queryName,
    kind: kind,
    options: queryOptions,
    data_source_id: dataSourceId,
    plugin_id: null,
  });

  const params = {
    headers: getAuthHeaders(authToken, workspaceId),
    timeout: DEFAULT_TIMEOUT,
    tags: { name: `create_${kind}_query` },
  };

  const response = http.post(
    `${BASE_URL}/api/data-queries/data-sources/${dataSourceId}/versions/${versionId}`,
    payload,
    params
  );

  const success = checkResponse(response, 201, `create ${kind} query`);

  let queryId = null;
  if (success) {
    try {
      const body = JSON.parse(response.body);
      queryId = body.id;
    } catch (e) {
      console.error(`Failed to parse ${kind} query response`);
    }
  }

  return { success, queryId };
}

/**
 * Run a query (generic function)
 */
function runQuery(authToken, workspaceId, appId, queryId, versionId, environmentId, kind) {
  const params = {
    headers: getAuthHeaders(authToken, workspaceId, {
      'Cookie': `tj_auth_token=${authToken}; app_id=${appId}`,
    }),
    timeout: QUERY_TIMEOUT,
    tags: { name: `run_${kind}_query` },
  };

  const response = http.post(
    `${BASE_URL}/api/data-queries/${queryId}/versions/${versionId}/run/${environmentId}`,
    JSON.stringify({}),
    params
  );

  return checkResponse(response, 201, `run ${kind} query`);
}

/**
 * Delete data source
 */
function deleteDataSource(authToken, workspaceId, dataSourceId, kind) {
  const params = {
    headers: getAuthHeaders(authToken, workspaceId),
    timeout: DEFAULT_TIMEOUT,
    tags: { name: `delete_${kind}_ds` },
  };

  const response = http.del(`${BASE_URL}/api/data-sources/${dataSourceId}`, null, params);
  return checkResponse(response, 200, `delete ${kind} data source`);
}

// ===================================================================
// TEST SCENARIO
// ===================================================================

export default function () {
  let authData;
  let appData;
  let postgresDS, mysqlDS, restapiDS;
  let postgresQuery, mysqlQuery, restapiQuery;

  // Randomly pick which data source to use for this iteration
  const dsChoice = Math.floor(Math.random() * 3); // 0=postgres, 1=mysql, 2=restapi

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
    const appName = uniqueName('LoadTest-AllDS');

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
  // STEP 3: CREATE DATA SOURCE (Based on random choice)
  // ===================================================================
  group('Create Data Source', function () {
    if (dsChoice === 0) {
      // PostgreSQL
      const dsName = uniqueName('postgres-ds');
      const options = [
        { key: 'host', value: POSTGRES_CONFIG.host },
        { key: 'port', value: POSTGRES_CONFIG.port },
        { key: 'database', value: POSTGRES_CONFIG.database },
        { key: 'username', value: POSTGRES_CONFIG.username },
        { key: 'password', value: POSTGRES_CONFIG.password, encrypted: true },
        { key: 'ssl_enabled', value: false },
        { key: 'ssl_certificate', value: 'none' },
      ];

      postgresDS = createDataSource(
        authData.authToken,
        authData.workspaceId,
        dsName,
        'postgresql',
        options
      );

      if (postgresDS.success) {
        console.log(`✓ PostgreSQL data source created`);
      }
    } else if (dsChoice === 1) {
      // MySQL
      const dsName = uniqueName('mysql-ds');
      const options = [
        { key: 'host', value: MYSQL_CONFIG.host },
        { key: 'port', value: MYSQL_CONFIG.port },
        { key: 'database', value: MYSQL_CONFIG.database },
        { key: 'username', value: MYSQL_CONFIG.username },
        { key: 'password', value: MYSQL_CONFIG.password, encrypted: true },
        { key: 'ssl_enabled', value: false },
        { key: 'ssl_certificate', value: 'none' },
      ];

      mysqlDS = createDataSource(
        authData.authToken,
        authData.workspaceId,
        dsName,
        'mysql',
        options
      );

      if (mysqlDS.success) {
        console.log(`✓ MySQL data source created`);
      }
    } else {
      // REST API
      const dsName = uniqueName('restapi-ds');
      const options = [
        { key: 'url', value: RESTAPI_CONFIG.url },
        { key: 'auth_type', value: 'none', encrypted: false },
        { key: 'headers', value: [], encrypted: false },
        { key: 'url_params', value: [], encrypted: false },
      ];

      restapiDS = createDataSource(
        authData.authToken,
        authData.workspaceId,
        dsName,
        'restapi',
        options
      );

      if (restapiDS.success) {
        console.log(`✓ REST API data source created`);
      }
    }
  });

  adjustedSleep(5, 3);

  // ===================================================================
  // STEP 4: CREATE QUERY (Based on data source created)
  // ===================================================================
  group('Create Data Query', function () {
    if (dsChoice === 0 && postgresDS && postgresDS.success) {
      // PostgreSQL Query
      const queryOptions = {
        mode: 'sql',
        query: 'SELECT 1 as test_value;',
        transformationLanguage: 'javascript',
        enableTransformation: false,
      };

      postgresQuery = createQuery(
        authData.authToken,
        authData.workspaceId,
        appData.appId,
        appData.editingVersionId,
        postgresDS.dataSourceId,
        uniqueName('pg-query'),
        'postgresql',
        queryOptions
      );

      if (postgresQuery.success) {
        console.log(`✓ PostgreSQL query created`);
      }
    } else if (dsChoice === 1 && mysqlDS && mysqlDS.success) {
      // MySQL Query
      const queryOptions = {
        mode: 'sql',
        query: 'SELECT 1 as test_value;',
        transformationLanguage: 'javascript',
        enableTransformation: false,
      };

      mysqlQuery = createQuery(
        authData.authToken,
        authData.workspaceId,
        appData.appId,
        appData.editingVersionId,
        mysqlDS.dataSourceId,
        uniqueName('mysql-query'),
        'mysql',
        queryOptions
      );

      if (mysqlQuery.success) {
        console.log(`✓ MySQL query created`);
      }
    } else if (dsChoice === 2 && restapiDS && restapiDS.success) {
      // REST API Query
      const queryOptions = {
        method: 'GET',
        url: RESTAPI_CONFIG.endpoint || '/users',
        headers: [],
        url_params: [],
        body: [],
        json_body: null,
        body_toggle: false,
        transformationLanguage: 'javascript',
        enableTransformation: false,
      };

      restapiQuery = createQuery(
        authData.authToken,
        authData.workspaceId,
        appData.appId,
        appData.editingVersionId,
        restapiDS.dataSourceId,
        uniqueName('rest-query'),
        'restapi',
        queryOptions
      );

      if (restapiQuery.success) {
        console.log(`✓ REST API query created`);
      }
    }
  });

  adjustedSleep(5, 3);

  // ===================================================================
  // STEP 5: RUN QUERY
  // ===================================================================
  group('Run Query', function () {
    if (dsChoice === 0 && postgresQuery && postgresQuery.success) {
      const success = runQuery(
        authData.authToken,
        authData.workspaceId,
        appData.appId,
        postgresQuery.queryId,
        appData.editingVersionId,
        appData.environmentId,
        'postgresql'
      );
      if (success) console.log(`✓ PostgreSQL query executed`);
    } else if (dsChoice === 1 && mysqlQuery && mysqlQuery.success) {
      const success = runQuery(
        authData.authToken,
        authData.workspaceId,
        appData.appId,
        mysqlQuery.queryId,
        appData.editingVersionId,
        appData.environmentId,
        'mysql'
      );
      if (success) console.log(`✓ MySQL query executed`);
    } else if (dsChoice === 2 && restapiQuery && restapiQuery.success) {
      const success = runQuery(
        authData.authToken,
        authData.workspaceId,
        appData.appId,
        restapiQuery.queryId,
        appData.editingVersionId,
        appData.environmentId,
        'restapi'
      );
      if (success) console.log(`✓ REST API query executed`);
    }
  });

  adjustedSleep(10, 5);

  // ===================================================================
  // STEP 6: RUN QUERY AGAIN
  // ===================================================================
  group('Run Query Again', function () {
    if (dsChoice === 0 && postgresQuery && postgresQuery.success) {
      runQuery(
        authData.authToken,
        authData.workspaceId,
        appData.appId,
        postgresQuery.queryId,
        appData.editingVersionId,
        appData.environmentId,
        'postgresql'
      );
      console.log(`✓ PostgreSQL query re-executed`);
    } else if (dsChoice === 1 && mysqlQuery && mysqlQuery.success) {
      runQuery(
        authData.authToken,
        authData.workspaceId,
        appData.appId,
        mysqlQuery.queryId,
        appData.editingVersionId,
        appData.environmentId,
        'mysql'
      );
      console.log(`✓ MySQL query re-executed`);
    } else if (dsChoice === 2 && restapiQuery && restapiQuery.success) {
      runQuery(
        authData.authToken,
        authData.workspaceId,
        appData.appId,
        restapiQuery.queryId,
        appData.editingVersionId,
        appData.environmentId,
        'restapi'
      );
      console.log(`✓ REST API query re-executed`);
    }
  });

  adjustedSleep(5, 3);

  // ===================================================================
  // STEP 7: DELETE DATA SOURCE
  // ===================================================================
  group('Delete Data Source', function () {
    if (dsChoice === 0 && postgresDS && postgresDS.success) {
      deleteDataSource(authData.authToken, authData.workspaceId, postgresDS.dataSourceId, 'postgresql');
      console.log(`✓ PostgreSQL data source deleted`);
    } else if (dsChoice === 1 && mysqlDS && mysqlDS.success) {
      deleteDataSource(authData.authToken, authData.workspaceId, mysqlDS.dataSourceId, 'mysql');
      console.log(`✓ MySQL data source deleted`);
    } else if (dsChoice === 2 && restapiDS && restapiDS.success) {
      deleteDataSource(authData.authToken, authData.workspaceId, restapiDS.dataSourceId, 'restapi');
      console.log(`✓ REST API data source deleted`);
    }
  });

  adjustedSleep(3, 2);

  // ===================================================================
  // STEP 8: DELETE APP
  // ===================================================================
  group('Delete App', function () {
    deleteApp(authData.authToken, authData.workspaceId, appData.appId);
    console.log(`✓ App deleted: ${appData.appName}`);
  });

  adjustedSleep(3, 2);

  // ===================================================================
  // STEP 9: LOGOUT
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
  console.log('All Data Sources Mixed Journey Load Test');
  console.log('===================================');
  console.log(`Target VUs: ${VUS_MIXED}`);
  console.log(`Expected RPS: 15-18`);
  console.log(`Failure Rate Target: < 0.1%`);
  console.log('===================================');
  console.log('Journey: Login → Create App → Add DS (Random: PostgreSQL/MySQL/REST API) → Create Query → Run Query → Delete');
  console.log('===================================');
  console.log('Data Sources: PostgreSQL, MySQL, REST API (randomly selected)');
  console.log('===================================');
}

export function teardown(data) {
  console.log('===================================');
  console.log('Test Complete');
  console.log('===================================');
}
