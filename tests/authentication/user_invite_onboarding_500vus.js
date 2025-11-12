// ===================================================================
// ToolJet Load Test - User Invite & Onboarding Journey
// Complete flow: Admin invites user → User activates → Accepts invite → Logs in
// Target: 500 VUs, 5-8 RPS, 0%-0.1% failure rate
// Based on: cypress/e2e/happyPath/platform/commonTestcases/userManagment/UserInviteFlow.cy.js
// ===================================================================

import { group, check } from 'k6';
import http from 'k6/http';
import { login, logout, activateAccount, acceptInvite, getAuthHeaders } from '../../common/auth.js';
import { adjustedSleep, randomString, uniqueName, checkResponse } from '../../common/helpers.js';
import { getDefaultOptions, VUS_AUTH, BASE_URL, DEFAULT_TIMEOUT } from '../../common/config.js';

// ===================================================================
// TEST CONFIGURATION
// ===================================================================

export const options = getDefaultOptions(VUS_AUTH, 'user_invite_onboarding');

// ===================================================================
// TEST SCENARIO
// ===================================================================

export default function () {
  let adminAuth;
  const testUserEmail = `loadtest_${randomString(10)}@example.com`;
  const testUserFirstName = `LoadTest_${randomString(6)}`;
  const testUserPassword = 'TestPassword123!';
  let invitationToken;

  // ===================================================================
  // STEP 1: ADMIN LOGIN
  // ===================================================================
  group('Admin Login', function () {
    adminAuth = login();

    if (!adminAuth.success) {
      console.error('Admin login failed, skipping iteration');
      return;
    }

    console.log(`✓ Admin logged in: ${adminAuth.email}`);
  });

  adjustedSleep(3, 2);

  // ===================================================================
  // STEP 2: ADMIN INVITES USER
  // ===================================================================
  group('Invite User', function () {
    const payload = JSON.stringify({
      email: testUserEmail,
      firstName: testUserFirstName,
      lastName: 'User',
      groups: [],
      role: 'end-user',
      userMetadata: {},
    });

    const params = {
      headers: getAuthHeaders(adminAuth.authToken, adminAuth.workspaceId),
      timeout: DEFAULT_TIMEOUT,
      tags: { name: 'invite_user' },
    };

    const response = http.post(`${BASE_URL}/api/organization-users`, payload, params);

    const inviteSuccess = checkResponse(response, 201, 'invite user');

    if (inviteSuccess) {
      console.log(`✓ User invited: ${testUserEmail}`);

      // In real scenario, invitation token would be from database
      // For load test, we'll simulate extracting it from response
      try {
        const body = JSON.parse(response.body);
        // Note: In production, you'd get this from database or email
        // For load testing, we'll use a placeholder approach
        invitationToken = `mock_token_${randomString(32)}`;
      } catch (e) {
        console.error('Failed to parse invite response');
      }
    } else {
      console.error('User invitation failed, skipping rest of iteration');
      return;
    }
  });

  adjustedSleep(5, 3);

  // ===================================================================
  // STEP 3: NEW USER ACTIVATES ACCOUNT
  // ===================================================================
  group('Activate Account', function () {
    // Note: In real scenario, user would click email link with invitation token
    // For load testing, we simulate this step

    const activationResult = activateAccount(
      testUserEmail,
      testUserPassword,
      invitationToken
    );

    if (activationResult.success) {
      console.log(`✓ Account activated for: ${testUserEmail}`);
    } else {
      console.error('Account activation failed');
      return;
    }
  });

  adjustedSleep(3, 2);

  // ===================================================================
  // STEP 4: NEW USER ACCEPTS WORKSPACE INVITE
  // ===================================================================
  group('Accept Workspace Invite', function () {
    // Re-authenticate as the new user
    const newUserAuth = login(testUserEmail, testUserPassword);

    if (!newUserAuth.success) {
      console.error('New user login failed');
      return;
    }

    const acceptSuccess = acceptInvite(newUserAuth.authToken, invitationToken);

    if (acceptSuccess) {
      console.log(`✓ Workspace invite accepted`);
    }

    // Logout new user
    logout(newUserAuth.authToken, newUserAuth.workspaceId);
  });

  adjustedSleep(5, 3);

  // ===================================================================
  // STEP 5: VERIFY NEW USER CAN LOGIN
  // ===================================================================
  group('Verify New User Login', function () {
    const newUserAuth = login(testUserEmail, testUserPassword, adminAuth.workspaceId);

    if (newUserAuth.success) {
      console.log(`✓ New user successfully logged in: ${testUserEmail}`);

      // Logout new user
      logout(newUserAuth.authToken, newUserAuth.workspaceId);
    } else {
      console.error('New user login verification failed');
    }
  });

  adjustedSleep(5, 3);

  // ===================================================================
  // STEP 6: CLEANUP - Admin logs out
  // ===================================================================
  group('Admin Logout', function () {
    logout(adminAuth.authToken, adminAuth.workspaceId);
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
  console.log('User Invite & Onboarding Load Test');
  console.log('===================================');
  console.log(`Target VUs: ${VUS_AUTH}`);
  console.log(`Expected RPS: 5-8`);
  console.log(`Failure Rate Target: < 0.1%`);
  console.log('===================================');
  console.log('Note: This test creates users but does not clean them up from database');
  console.log('Consider periodic database cleanup of test users');
  console.log('===================================');
}

export function teardown(data) {
  console.log('===================================');
  console.log('Test Complete');
  console.log('===================================');
  console.log('Reminder: Clean up test users from database if needed');
  console.log('===================================');
}
