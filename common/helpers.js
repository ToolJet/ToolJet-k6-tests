// ===================================================================
// Common Helper Functions
// Reusable utilities for ToolJet load tests
// ===================================================================

import { sleep, check } from 'k6';
import http from 'k6/http';
import { SLEEP_MULTIPLIER, DEFAULT_TIMEOUT, DEBUG, BASE_URL } from './config.js';
import { getAuthHeaders } from './auth.js';

/**
 * Adjusted sleep with multiplier for load control
 * @param {number} baseSeconds - Base sleep duration in seconds
 * @param {number} randomSeconds - Random additional seconds (0-randomSeconds)
 */
export function adjustedSleep(baseSeconds, randomSeconds = 0) {
  const totalSleep = baseSeconds + (Math.random() * randomSeconds);
  sleep(totalSleep * SLEEP_MULTIPLIER);
}

/**
 * Generate random alphanumeric string
 * @param {number} length - Length of string to generate
 * @returns {string} Random string
 */
export function randomString(length = 8) {
  const charset = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += charset[Math.floor(Math.random() * charset.length)];
  }
  return result;
}

/**
 * Generate random integer within range
 * @param {number} min - Minimum value (inclusive)
 * @param {number} max - Maximum value (inclusive)
 * @returns {number} Random integer
 */
export function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Generate unique name with timestamp and random suffix
 * @param {string} prefix - Name prefix
 * @returns {string} Unique name
 */
export function uniqueName(prefix = 'test') {
  return `${prefix}_${Date.now()}_${randomString(6)}`;
}

/**
 * Standard response check helper
 * @param {object} response - HTTP response
 * @param {number} expectedStatus - Expected status code
 * @param {string} checkName - Name for the check
 * @returns {boolean} Check passed
 */
export function checkResponse(response, expectedStatus = 200, checkName = 'request') {
  const checkPassed = check(response, {
    [`${checkName} status is ${expectedStatus}`]: (r) => r.status === expectedStatus,
    [`${checkName} response time OK`]: (r) => r.timings.duration < 2000,
  });

  if (!checkPassed && DEBUG) {
    console.error(`Check failed for ${checkName}: ${response.status} - ${response.body.substring(0, 200)}`);
  }

  return checkPassed;
}

/**
 * Create ToolJet app
 * @param {string} authToken - Auth token
 * @param {string} workspaceId - Workspace ID
 * @param {string} appName - App name (optional, will generate unique name)
 * @param {string} appType - App type ('front-end' or 'mobile')
 * @returns {object} { success, appId, editingVersionId, environmentId }
 */
export function createApp(authToken, workspaceId, appName = null, appType = 'front-end') {
  const name = appName || uniqueName('load-test-app');

  const payload = JSON.stringify({
    type: appType,
    name,
    is_maintenance_on: false,
    workflow_enabled: false,
    creation_mode: 'DEFAULT',
  });

  const params = {
    headers: getAuthHeaders(authToken, workspaceId),
    timeout: DEFAULT_TIMEOUT,
    tags: { name: 'create_app' },
  };

  const response = http.post(`${BASE_URL}/api/apps`, payload, params);

  const success = checkResponse(response, 201, 'create app');

  if (!success) {
    return {
      success: false,
      appId: null,
      editingVersionId: null,
      environmentId: null,
    };
  }

  const body = JSON.parse(response.body);

  return {
    success: true,
    appId: body.id,
    appName: body.name,
    appSlug: body.slug,
    editingVersionId: body.editing_version?.id,
    environmentId: body.editorEnvironment?.id,
    homePageId: body.editing_version?.home_page_id,
  };
}

/**
 * Get app details
 * @param {string} authToken - Auth token
 * @param {string} workspaceId - Workspace ID
 * @param {string} appId - App ID
 * @returns {object} App details
 */
export function getApp(authToken, workspaceId, appId) {
  const params = {
    headers: getAuthHeaders(authToken, workspaceId),
    timeout: DEFAULT_TIMEOUT,
    tags: { name: 'get_app' },
  };

  const response = http.get(`${BASE_URL}/api/apps/${appId}`, params);

  const success = checkResponse(response, 200, 'get app');

  if (!success) {
    return { success: false };
  }

  const body = JSON.parse(response.body);

  return {
    success: true,
    appId: body.id,
    appName: body.name,
    editingVersionId: body.editing_version?.id,
    environmentId: body.editorEnvironment?.id,
    homePageId: body.editing_version?.home_page_id,
    isPublic: body.is_public,
    slug: body.slug,
  };
}

/**
 * Delete ToolJet app
 * @param {string} authToken - Auth token
 * @param {string} workspaceId - Workspace ID
 * @param {string} appId - App ID
 * @returns {boolean} Success status
 */
export function deleteApp(authToken, workspaceId, appId) {
  const params = {
    headers: getAuthHeaders(authToken, workspaceId),
    timeout: DEFAULT_TIMEOUT,
    tags: { name: 'delete_app' },
  };

  const response = http.del(`${BASE_URL}/api/apps/${appId}`, null, params);

  return checkResponse(response, 200, 'delete app');
}

/**
 * Release app version
 * @param {string} authToken - Auth token
 * @param {string} workspaceId - Workspace ID
 * @param {string} appId - App ID
 * @param {string} versionId - Version ID to release
 * @returns {boolean} Success status
 */
export function releaseApp(authToken, workspaceId, appId, versionId) {
  const payload = JSON.stringify({
    versionToBeReleased: versionId,
  });

  const params = {
    headers: getAuthHeaders(authToken, workspaceId),
    timeout: DEFAULT_TIMEOUT,
    tags: { name: 'release_app' },
  };

  const response = http.put(`${BASE_URL}/api/apps/${appId}/release`, payload, params);

  return checkResponse(response, 200, 'release app');
}

/**
 * Make app public
 * @param {string} authToken - Auth token
 * @param {string} workspaceId - Workspace ID
 * @param {string} appId - App ID
 * @returns {boolean} Success status
 */
export function makeAppPublic(authToken, workspaceId, appId) {
  const payload = JSON.stringify({
    app: { is_public: true },
  });

  const params = {
    headers: getAuthHeaders(authToken, workspaceId),
    timeout: DEFAULT_TIMEOUT,
    tags: { name: 'make_app_public' },
  };

  const response = http.put(`${BASE_URL}/api/apps/${appId}`, payload, params);

  return checkResponse(response, 200, 'make app public');
}

/**
 * Create folder
 * @param {string} authToken - Auth token
 * @param {string} workspaceId - Workspace ID
 * @param {string} folderName - Folder name
 * @param {string} folderType - Folder type ('front-end' or 'workflow')
 * @returns {object} { success, folderId }
 */
export function createFolder(authToken, workspaceId, folderName = null, folderType = 'front-end') {
  const name = folderName || uniqueName('load-test-folder');

  const payload = JSON.stringify({
    name,
    type: folderType,
  });

  const params = {
    headers: getAuthHeaders(authToken, workspaceId),
    timeout: DEFAULT_TIMEOUT,
    tags: { name: 'create_folder' },
  };

  const response = http.post(`${BASE_URL}/api/folders`, payload, params);

  const success = checkResponse(response, 201, 'create folder');

  if (!success) {
    return { success: false, folderId: null };
  }

  const body = JSON.parse(response.body);

  return {
    success: true,
    folderId: body.id || body.folderId,
    folderName: body.name,
  };
}

/**
 * Delete folder
 * @param {string} authToken - Auth token
 * @param {string} workspaceId - Workspace ID
 * @param {string} folderId - Folder ID
 * @returns {boolean} Success status
 */
export function deleteFolder(authToken, workspaceId, folderId) {
  const params = {
    headers: getAuthHeaders(authToken, workspaceId),
    timeout: DEFAULT_TIMEOUT,
    tags: { name: 'delete_folder' },
  };

  const response = http.del(`${BASE_URL}/api/folders/${folderId}`, null, params);

  return checkResponse(response, 200, 'delete folder');
}

/**
 * List apps in workspace
 * @param {string} authToken - Auth token
 * @param {string} workspaceId - Workspace ID
 * @param {number} page - Page number
 * @returns {object} { success, apps, totalCount }
 */
export function listApps(authToken, workspaceId, page = 1) {
  const params = {
    headers: getAuthHeaders(authToken, workspaceId),
    timeout: DEFAULT_TIMEOUT,
    tags: { name: 'list_apps' },
  };

  const response = http.get(`${BASE_URL}/api/apps?page=${page}&type=front-end`, params);

  const success = checkResponse(response, 200, 'list apps');

  if (!success) {
    return { success: false, apps: [], totalCount: 0 };
  }

  const body = JSON.parse(response.body);

  return {
    success: true,
    apps: body.apps || [],
    totalCount: body.total_count || 0,
  };
}

/**
 * Wait for async operation to complete (polling)
 * @param {function} checkFunction - Function that returns true when operation complete
 * @param {number} maxAttempts - Maximum polling attempts
 * @param {number} sleepDuration - Sleep duration between attempts in seconds
 * @returns {boolean} Operation completed successfully
 */
export function waitForCompletion(checkFunction, maxAttempts = 10, sleepDuration = 2) {
  for (let i = 0; i < maxAttempts; i++) {
    if (checkFunction()) {
      return true;
    }
    sleep(sleepDuration);
  }
  return false;
}

/**
 * Parse JSON response safely
 * @param {string} body - Response body
 * @returns {object|null} Parsed object or null if parsing fails
 */
export function safeJSONParse(body) {
  try {
    return JSON.parse(body);
  } catch (e) {
    if (DEBUG) {
      console.error(`Failed to parse JSON: ${e}`);
    }
    return null;
  }
}
