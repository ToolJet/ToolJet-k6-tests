// ===================================================================
// Authentication Helper Functions
// Reusable authentication utilities for ToolJet load tests
// ===================================================================

import http from 'k6/http';
import { check } from 'k6';
import { BASE_URL, DEFAULT_EMAIL, DEFAULT_PASSWORD, AUTH_TIMEOUT, DEBUG } from './config.js';

/**
 * Authenticate user and return auth token and workspace ID
 * @param {string} email - User email
 * @param {string} password - User password
 * @param {string} workspaceId - Optional workspace ID for organization-specific login
 * @returns {object} { authToken, workspaceId, userId, success }
 */
export function login(email = DEFAULT_EMAIL, password = DEFAULT_PASSWORD, workspaceId = '') {
  const endpoint = workspaceId
    ? `${BASE_URL}/api/authenticate/${workspaceId}`
    : `${BASE_URL}/api/authenticate`;

  const payload = JSON.stringify({
    email,
    password,
    redirectTo: '/',
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
    timeout: AUTH_TIMEOUT,
    tags: { name: 'login' },
  };

  const response = http.post(endpoint, payload, params);

  const loginSuccess = check(response, {
    'login status is 201': (r) => r.status === 201,
    'login response has auth_token cookie': (r) => r.cookies.tj_auth_token && r.cookies.tj_auth_token.length > 0,
  });

  if (!loginSuccess) {
    if (DEBUG) {
      console.error(`Login failed: ${response.status} - ${response.body}`);
    }
    return {
      authToken: null,
      workspaceId: null,
      userId: null,
      success: false,
      error: response.body,
    };
  }

  // Extract auth token from cookies
  const authToken = response.cookies.tj_auth_token[0].value;

  // Parse response body
  let responseBody;
  try {
    responseBody = JSON.parse(response.body);
  } catch (e) {
    if (DEBUG) {
      console.error(`Failed to parse login response: ${e}`);
    }
    return {
      authToken,
      workspaceId: null,
      userId: null,
      success: false,
      error: 'Failed to parse response',
    };
  }

  return {
    authToken,
    workspaceId: responseBody.current_organization_id,
    userId: responseBody.id,
    email: responseBody.email,
    firstName: responseBody.first_name,
    lastName: responseBody.last_name,
    role: responseBody.role,
    success: true,
  };
}

/**
 * Logout user
 * @param {string} authToken - JWT auth token
 * @param {string} workspaceId - Workspace ID
 * @returns {boolean} Success status
 */
export function logout(authToken, workspaceId) {
  const params = {
    headers: getAuthHeaders(authToken, workspaceId),
    timeout: AUTH_TIMEOUT,
    tags: { name: 'logout' },
  };

  const response = http.get(`${BASE_URL}/api/session/logout`, params);

  const logoutSuccess = check(response, {
    'logout status is 200': (r) => r.status === 200,
  });

  if (!logoutSuccess && DEBUG) {
    console.error(`Logout failed: ${response.status} - ${response.body}`);
  }

  return logoutSuccess;
}

/**
 * Get standard authentication headers for authenticated requests
 * @param {string} authToken - JWT auth token
 * @param {string} workspaceId - Workspace ID
 * @param {object} additionalHeaders - Additional headers to merge
 * @returns {object} Headers object
 */
export function getAuthHeaders(authToken, workspaceId, additionalHeaders = {}) {
  return {
    'Tj-Workspace-Id': workspaceId,
    'Cookie': `tj_auth_token=${authToken}`,
    'Content-Type': 'application/json',
    ...additionalHeaders,
  };
}

/**
 * Verify current session is valid
 * @param {string} authToken - JWT auth token
 * @param {string} workspaceId - Workspace ID
 * @returns {boolean} Session valid status
 */
export function verifySession(authToken, workspaceId) {
  const params = {
    headers: getAuthHeaders(authToken, workspaceId),
    timeout: AUTH_TIMEOUT,
    tags: { name: 'verify_session' },
  };

  const response = http.get(`${BASE_URL}/api/authorize`, params);

  const sessionValid = check(response, {
    'session valid': (r) => r.status === 200,
  });

  if (!sessionValid && DEBUG) {
    console.error(`Session verification failed: ${response.status}`);
  }

  return sessionValid;
}

/**
 * Request password reset
 * @param {string} email - User email
 * @returns {object} { success, token }
 */
export function requestPasswordReset(email) {
  const payload = JSON.stringify({ email });

  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
    timeout: AUTH_TIMEOUT,
    tags: { name: 'password_reset_request' },
  };

  const response = http.post(`${BASE_URL}/api/forgot-password`, payload, params);

  const success = check(response, {
    'password reset request status is 201': (r) => r.status === 201,
  });

  return {
    success,
    response: response.body,
  };
}

/**
 * Reset password with token
 * @param {string} token - Reset token
 * @param {string} newPassword - New password
 * @returns {boolean} Success status
 */
export function resetPassword(token, newPassword) {
  const payload = JSON.stringify({
    token,
    password: newPassword,
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
    timeout: AUTH_TIMEOUT,
    tags: { name: 'password_reset' },
  };

  const response = http.post(`${BASE_URL}/api/reset-password`, payload, params);

  const success = check(response, {
    'password reset status is 200': (r) => r.status === 200,
  });

  if (!success && DEBUG) {
    console.error(`Password reset failed: ${response.status} - ${response.body}`);
  }

  return success;
}

/**
 * Activate account with invitation token
 * @param {string} email - User email
 * @param {string} password - User password
 * @param {string} organizationToken - Organization invitation token
 * @returns {object} { success, authToken }
 */
export function activateAccount(email, password, organizationToken) {
  const payload = JSON.stringify({
    email,
    password,
    organizationToken,
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
    timeout: AUTH_TIMEOUT,
    tags: { name: 'activate_account' },
  };

  const response = http.post(`${BASE_URL}/api/onboarding/activate-account-with-token`, payload, params);

  const success = check(response, {
    'account activation status is 201': (r) => r.status === 201,
  });

  if (!success) {
    if (DEBUG) {
      console.error(`Account activation failed: ${response.status} - ${response.body}`);
    }
    return {
      success: false,
      authToken: null,
    };
  }

  // Extract auth token from Set-Cookie header
  let authToken = null;
  if (response.headers['Set-Cookie']) {
    const setCookies = Array.isArray(response.headers['Set-Cookie'])
      ? response.headers['Set-Cookie']
      : [response.headers['Set-Cookie']];

    const authCookie = setCookies.find(c => c.startsWith('tj_auth_token='));
    if (authCookie) {
      authToken = authCookie.split('=')[1].split(';')[0];
    }
  }

  return {
    success,
    authToken,
  };
}

/**
 * Accept workspace invitation
 * @param {string} authToken - Auth token from activation
 * @param {string} invitationToken - Invitation token
 * @returns {boolean} Success status
 */
export function acceptInvite(authToken, invitationToken) {
  const payload = JSON.stringify({
    token: invitationToken,
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Cookie': `tj_auth_token=${authToken}`,
    },
    timeout: AUTH_TIMEOUT,
    tags: { name: 'accept_invite' },
  };

  const response = http.post(`${BASE_URL}/api/onboarding/accept-invite`, payload, params);

  const success = check(response, {
    'accept invite status is 201': (r) => r.status === 201,
  });

  if (!success && DEBUG) {
    console.error(`Accept invite failed: ${response.status} - ${response.body}`);
  }

  return success;
}
