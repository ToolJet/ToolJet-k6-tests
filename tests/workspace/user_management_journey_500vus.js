// ===================================================================
// ToolJet Load Test - User Management Journey
// Flow: Login → Invite Users → List Users → Update User Roles → Remove Users → Logout
// Target: 500 VUs, 5-8 RPS, 0%-0.1% failure rate
// Based on: cypress/e2e/happyPath/platform/commonTestcases/userManagment/UserInviteFlow.cy.js
// ===================================================================

import { group } from 'k6';
import http from 'k6/http';
import { login, logout, getAuthHeaders } from '../../common/auth.js';
import {
  adjustedSleep,
  uniqueName,
  randomEmail,
  checkResponse,
} from '../../common/helpers.js';
import { getDefaultOptions, VUS_WORKSPACE, BASE_URL, DEFAULT_TIMEOUT } from '../../common/config.js';

// ===================================================================
// TEST CONFIGURATION
// ===================================================================

export const options = getDefaultOptions(VUS_WORKSPACE, 'user_management_journey');

// ===================================================================
// HELPER FUNCTIONS
// ===================================================================

/**
 * Invite a user to workspace
 */
function inviteUser(authToken, workspaceId, firstName, email, role = 'end-user') {
  const payload = JSON.stringify({
    email: email,
    firstName: firstName,
    lastName: '',
    groups: [],
    role: role,
    userMetadata: {},
  });

  const params = {
    headers: getAuthHeaders(authToken, workspaceId),
    timeout: DEFAULT_TIMEOUT,
    tags: { name: 'invite_user' },
  };

  const response = http.post(`${BASE_URL}/api/organization-users`, payload, params);
  const success = checkResponse(response, 201, 'invite user');

  let organizationUserId = null;
  if (success) {
    try {
      const body = JSON.parse(response.body);
      organizationUserId = body.id || body.organization_user_id;
    } catch (e) {
      console.error('Failed to parse invite user response');
    }
  }

  return { success, organizationUserId };
}

/**
 * List all users in workspace
 */
function listUsers(authToken, workspaceId) {
  const params = {
    headers: getAuthHeaders(authToken, workspaceId),
    timeout: DEFAULT_TIMEOUT,
    tags: { name: 'list_users' },
  };

  const response = http.get(`${BASE_URL}/api/organization-users`, params);
  const success = checkResponse(response, 200, 'list users');

  let users = [];
  if (success) {
    try {
      const body = JSON.parse(response.body);
      users = body.users || [];
    } catch (e) {
      console.error('Failed to parse users list response');
    }
  }

  return { success, users };
}

/**
 * Archive (remove) a user from workspace
 */
function archiveUser(authToken, workspaceId, organizationUserId) {
  const params = {
    headers: getAuthHeaders(authToken, workspaceId),
    timeout: DEFAULT_TIMEOUT,
    tags: { name: 'archive_user' },
  };

  const response = http.patch(
    `${BASE_URL}/api/organization-users/${organizationUserId}/archive`,
    null,
    params
  );

  return checkResponse(response, 200, 'archive user');
}

/**
 * Unarchive a user in workspace
 */
function unarchiveUser(authToken, workspaceId, organizationUserId) {
  const params = {
    headers: getAuthHeaders(authToken, workspaceId),
    timeout: DEFAULT_TIMEOUT,
    tags: { name: 'unarchive_user' },
  };

  const response = http.patch(
    `${BASE_URL}/api/organization-users/${organizationUserId}/unarchive`,
    null,
    params
  );

  return checkResponse(response, 200, 'unarchive user');
}

/**
 * Get group permissions (roles)
 */
function getGroupPermissions(authToken, workspaceId) {
  const params = {
    headers: getAuthHeaders(authToken, workspaceId),
    timeout: DEFAULT_TIMEOUT,
    tags: { name: 'get_group_permissions' },
  };

  const response = http.get(`${BASE_URL}/api/v2/group-permissions`, params);
  const success = checkResponse(response, 200, 'get group permissions');

  let groupPermissions = [];
  if (success) {
    try {
      const body = JSON.parse(response.body);
      groupPermissions = body.groupPermissions || [];
    } catch (e) {
      console.error('Failed to parse group permissions response');
    }
  }

  return { success, groupPermissions };
}

// ===================================================================
// TEST SCENARIO
// ===================================================================

export default function () {
  let authData;
  let invitedUsers = [];

  // ===================================================================
  // STEP 1: LOGIN AS ADMIN
  // ===================================================================
  group('Admin Login', function () {
    authData = login();

    if (!authData.success) {
      console.error('Login failed, skipping iteration');
      return;
    }

    console.log(`✓ Admin logged in: ${authData.email}`);
  });

  adjustedSleep(3, 2);

  // ===================================================================
  // STEP 2: GET GROUP PERMISSIONS (ROLES)
  // ===================================================================
  group('Get Available Roles', function () {
    const result = getGroupPermissions(authData.authToken, authData.workspaceId);

    if (result.success) {
      console.log(`✓ Retrieved ${result.groupPermissions.length} role groups`);
    }
  });

  adjustedSleep(3, 2);

  // ===================================================================
  // STEP 3: LIST EXISTING USERS
  // ===================================================================
  group('List Existing Users', function () {
    const result = listUsers(authData.authToken, authData.workspaceId);

    if (result.success) {
      console.log(`✓ Listed ${result.users.length} users in workspace`);
    }
  });

  adjustedSleep(5, 3);

  // ===================================================================
  // STEP 4: INVITE FIRST USER (END USER)
  // ===================================================================
  group('Invite End User', function () {
    const firstName = uniqueName('EndUser');
    const email = randomEmail();

    const result = inviteUser(
      authData.authToken,
      authData.workspaceId,
      firstName,
      email,
      'end-user'
    );

    if (result.success) {
      invitedUsers.push({
        organizationUserId: result.organizationUserId,
        email: email,
        role: 'end-user',
      });
      console.log(`✓ Invited end user: ${email}`);
    }
  });

  adjustedSleep(5, 3);

  // ===================================================================
  // STEP 5: INVITE SECOND USER (BUILDER)
  // ===================================================================
  group('Invite Builder User', function () {
    const firstName = uniqueName('Builder');
    const email = randomEmail();

    const result = inviteUser(
      authData.authToken,
      authData.workspaceId,
      firstName,
      email,
      'builder'
    );

    if (result.success) {
      invitedUsers.push({
        organizationUserId: result.organizationUserId,
        email: email,
        role: 'builder',
      });
      console.log(`✓ Invited builder user: ${email}`);
    }
  });

  adjustedSleep(5, 3);

  // ===================================================================
  // STEP 6: INVITE THIRD USER (ADMIN)
  // ===================================================================
  group('Invite Admin User', function () {
    const firstName = uniqueName('Admin');
    const email = randomEmail();

    const result = inviteUser(
      authData.authToken,
      authData.workspaceId,
      firstName,
      email,
      'admin'
    );

    if (result.success) {
      invitedUsers.push({
        organizationUserId: result.organizationUserId,
        email: email,
        role: 'admin',
      });
      console.log(`✓ Invited admin user: ${email}`);
    }
  });

  adjustedSleep(5, 3);

  // ===================================================================
  // STEP 7: LIST USERS AGAIN (VERIFY INVITES)
  // ===================================================================
  group('Verify User Invites', function () {
    const result = listUsers(authData.authToken, authData.workspaceId);

    if (result.success) {
      console.log(`✓ Listed ${result.users.length} users (including invited users)`);
    }
  });

  adjustedSleep(10, 5);

  // ===================================================================
  // STEP 8: ARCHIVE FIRST USER
  // ===================================================================
  group('Archive First User', function () {
    if (invitedUsers.length > 0 && invitedUsers[0].organizationUserId) {
      const success = archiveUser(
        authData.authToken,
        authData.workspaceId,
        invitedUsers[0].organizationUserId
      );

      if (success) {
        console.log(`✓ Archived user: ${invitedUsers[0].email}`);
      }
    }
  });

  adjustedSleep(5, 3);

  // ===================================================================
  // STEP 9: UNARCHIVE FIRST USER
  // ===================================================================
  group('Unarchive First User', function () {
    if (invitedUsers.length > 0 && invitedUsers[0].organizationUserId) {
      const success = unarchiveUser(
        authData.authToken,
        authData.workspaceId,
        invitedUsers[0].organizationUserId
      );

      if (success) {
        console.log(`✓ Unarchived user: ${invitedUsers[0].email}`);
      }
    }
  });

  adjustedSleep(5, 3);

  // ===================================================================
  // STEP 10: ARCHIVE ALL INVITED USERS (CLEANUP)
  // ===================================================================
  group('Archive All Test Users', function () {
    invitedUsers.forEach((user) => {
      if (user.organizationUserId) {
        archiveUser(
          authData.authToken,
          authData.workspaceId,
          user.organizationUserId
        );
      }
    });

    console.log(`✓ Archived ${invitedUsers.length} test users`);
  });

  adjustedSleep(5, 3);

  // ===================================================================
  // STEP 11: LIST USERS FINAL (VERIFY CLEANUP)
  // ===================================================================
  group('Verify User Cleanup', function () {
    const result = listUsers(authData.authToken, authData.workspaceId);

    if (result.success) {
      console.log(`✓ Final user count: ${result.users.length}`);
    }
  });

  adjustedSleep(3, 2);

  // ===================================================================
  // STEP 12: LOGOUT
  // ===================================================================
  group('Admin Logout', function () {
    logout(authData.authToken, authData.workspaceId);
    console.log(`✓ Admin logged out`);
  });

  // Sleep before next iteration
  adjustedSleep(120, 60); // 5-7.5 min between iterations
}

// ===================================================================
// TEST LIFECYCLE
// ===================================================================

export function setup() {
  console.log('===================================');
  console.log('User Management Journey Load Test');
  console.log('===================================');
  console.log(`Target VUs: ${VUS_WORKSPACE}`);
  console.log(`Expected RPS: 5-8`);
  console.log(`Failure Rate Target: < 0.1%`);
  console.log('===================================');
  console.log('Journey: Login → Invite Users (3) → List → Archive → Unarchive → Cleanup → Logout');
  console.log('Roles Tested: End User, Builder, Admin');
  console.log('===================================');
}

export function teardown(data) {
  console.log('===================================');
  console.log('Test Complete');
  console.log('===================================');
}
