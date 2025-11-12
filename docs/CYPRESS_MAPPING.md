# Cypress to K6 Test Mapping

This document maps the k6 load tests to their corresponding Cypress end-to-end tests in the ToolJet repository.

## Overview

The k6 test suite is based on 93+ Cypress test scenarios from the ToolJet repository at `/Users/adishm/code/ToolJet/cypress-tests`. Each k6 test represents a complete user journey that simulates real-world usage patterns at scale.

---

## Authentication Tests

### 1. Login/Logout Journey (500 VUs, 8-10 RPS)
**K6 Test:** `tests/authentication/login_logout_journey_500vus.js`

**Based on Cypress Tests:**
- `cypress/e2e/happyPath/authentication/loginHappyPath.cy.js`
- `cypress/e2e/happyPath/authentication/logoutHappyPath.cy.js`

**Journey Flow:**
1. User Login → Verify Session → List Apps → Logout

**Key API Calls:**
- `POST /api/authenticate/{workspaceId}` - Login
- `GET /api/session` - Verify session
- `GET /api/folders` - List apps
- `GET /api/session/logout` - Logout

---

### 2. User Invite & Onboarding (500 VUs, 5-8 RPS)
**K6 Test:** `tests/authentication/user_invite_onboarding_500vus.js`

**Based on Cypress Tests:**
- `cypress/e2e/happyPath/platform/commonTestcases/userManagment/UserInviteFlow.cy.js`
- `cypress/e2e/happyPath/authentication/signupHappyPath.cy.js`

**Journey Flow:**
1. Admin invites user → User activates account → User accepts invite → User logs in

**Key API Calls:**
- `POST /api/organization-users` - Invite user
- `POST /api/activate` - Activate account
- `POST /api/accept-invite` - Accept invite
- `POST /api/authenticate/{workspaceId}` - Login

---

### 3. Password Reset Journey (500 VUs, 5-8 RPS)
**K6 Test:** `tests/authentication/password_reset_journey_500vus.js`

**Based on Cypress Tests:**
- `cypress/e2e/happyPath/authentication/forgotPasswordHappyPath.cy.js`
- `cypress/e2e/happyPath/authentication/resetPasswordHappyPath.cy.js`

**Journey Flow:**
1. Request password reset → Reset password → Login with new password

**Key API Calls:**
- `POST /api/forgot-password` - Request reset
- `POST /api/reset-password` - Reset password
- `POST /api/authenticate/{workspaceId}` - Login

---

## App Builder Tests

### 4. App Lifecycle Journey (500 VUs, 8-10 RPS)
**K6 Test:** `tests/appBuilder/app_lifecycle_journey_500vus.js`

**Based on Cypress Tests:**
- `cypress/e2e/happyPath/appbuilder/commonTestcases/appCRUD.cy.js`
- `cypress/e2e/happyPath/appbuilder/commonTestcases/releaseApp.cy.js`

**Journey Flow:**
1. Login → Create app → Open for editing → Release → Verify → Delete → Logout

**Key API Calls:**
- `POST /api/apps` - Create app
- `GET /api/apps/{appId}` - Get app details
- `POST /api/apps/{appId}/release` - Release app
- `DELETE /api/apps/{appId}` - Delete app

---

### 5. Component Workflow Journey (500 VUs, 6-8 RPS)
**K6 Test:** `tests/appBuilder/component_workflow_journey_500vus.js`

**Based on Cypress Tests:**
- `cypress/e2e/happyPath/appbuilder/commonTestcases/tableHappyPath.cy.js`
- `cypress/e2e/happyPath/appbuilder/commonTestcases/buttonHappyPath.cy.js`
- `cypress/e2e/happyPath/appbuilder/commonTestcases/textHappyPath.cy.js`

**Journey Flow:**
1. Create app → Add table component → Add button → Add text → Delete

**Key API Calls:**
- `POST /api/apps` - Create app
- `POST /api/v2/apps/{appId}/versions/{versionId}/components` - Add components
- `DELETE /api/apps/{appId}` - Delete app

---

### 6. Multi-Page App Journey (500 VUs, 5-8 RPS)
**K6 Test:** `tests/appBuilder/multipage_app_journey_500vus.js`

**Based on Cypress Tests:**
- `cypress/e2e/happyPath/appbuilder/commonTestcases/multipageHappyPath.cy.js`

**Journey Flow:**
1. Create app → Add page 2 → Add page 3 → Fetch pages → Navigate → Delete

**Key API Calls:**
- `POST /api/apps` - Create app
- `POST /api/v2/apps/{appId}/versions/{versionId}/pages` - Add pages
- `GET /api/v2/apps/{appId}/versions/{versionId}/pages` - Get pages
- `DELETE /api/apps/{appId}` - Delete app

---

## Data Source Tests

### 7. PostgreSQL Full Journey (500 VUs, 8-10 RPS)
**K6 Test:** `tests/dataSources/postgresql_full_journey_500vus.js`

**Based on Cypress Tests:**
- `cypress/e2e/happyPath/marketplace/commonTestcases/data-source/postgresHappyPath.cy.js`

**Journey Flow:**
1. Login → Create app → Add PostgreSQL DS → Create query → Run query (2x) → Delete DS → Delete app → Logout

**Key API Calls:**
- `POST /api/data-sources` - Create PostgreSQL data source
- `POST /api/data-queries/data-sources/{dsId}/versions/{versionId}` - Create query
- `POST /api/data-queries/{queryId}/versions/{versionId}/run/{envId}` - Run query
- `DELETE /api/data-sources/{dsId}` - Delete data source

---

### 8. MySQL Full Journey (500 VUs, 8-10 RPS)
**K6 Test:** `tests/dataSources/mysql_full_journey_500vus.js`

**Based on Cypress Tests:**
- `cypress/e2e/happyPath/marketplace/commonTestcases/data-source/mysqlHappyPath.cy.js`

**Journey Flow:**
1. Login → Create app → Add MySQL DS → Create query → Run query (2x) → Delete DS → Delete app → Logout

**Key API Calls:**
- Same as PostgreSQL but with `kind: 'mysql'`

---

### 9. REST API Full Journey (500 VUs, 10-12 RPS)
**K6 Test:** `tests/dataSources/restapi_full_journey_500vus.js`

**Based on Cypress Tests:**
- `cypress/e2e/happyPath/marketplace/commonTestcases/data-source/restApiHappyPath.cy.js`

**Journey Flow:**
1. Login → Create app → Add REST API DS → Create query → Run query (3x) → Delete DS → Delete app → Logout

**Key API Calls:**
- `POST /api/data-sources` with `kind: 'restapi'`
- Query creation and execution similar to SQL data sources

---

### 10. All Data Sources Mixed Journey (1000 VUs, 15-18 RPS)
**K6 Test:** `tests/dataSources/all_datasources_journey_1000vus.js`

**Based on Cypress Tests:**
- Combination of all data source tests
- Randomly selects PostgreSQL, MySQL, or REST API for each iteration

**Journey Flow:**
1. Login → Create app → Add DS (random: PG/MySQL/REST) → Create query → Run query (2x) → Delete DS → Delete app → Logout

---

## Workspace Tests

### 11. Workspace Setup Journey (500 VUs, 5-8 RPS)
**K6 Test:** `tests/workspace/workspace_setup_journey_500vus.js`

**Based on Cypress Tests:**
- `cypress/e2e/happyPath/platform/commonTestcases/workspace/workspace.cy.js`

**Journey Flow:**
1. Login → List workspaces → Create workspace → Switch → Verify → Edit → Logout

**Key API Calls:**
- `GET /api/organizations` - List workspaces
- `POST /api/organizations` - Create workspace
- `GET /api/switch/{workspaceId}` - Switch workspace
- `GET /api/organizations/{workspaceId}` - Get workspace details
- `PATCH /api/organizations/{workspaceId}` - Update workspace

---

### 12. User Management Journey (500 VUs, 5-8 RPS)
**K6 Test:** `tests/workspace/user_management_journey_500vus.js`

**Based on Cypress Tests:**
- `cypress/e2e/happyPath/platform/commonTestcases/userManagment/UserInviteFlow.cy.js`

**Journey Flow:**
1. Admin login → Get roles → List users → Invite users (3 roles) → Archive → Unarchive → Cleanup → Logout

**Key API Calls:**
- `GET /api/v2/group-permissions` - Get available roles
- `GET /api/organization-users` - List users
- `POST /api/organization-users` - Invite user
- `PATCH /api/organization-users/{userId}/archive` - Archive user
- `PATCH /api/organization-users/{userId}/unarchive` - Unarchive user

---

## End User Tests

### 13. Public App Viewing Journey (1000 VUs, 15-20 RPS)
**K6 Test:** `tests/endUser/public_app_viewing_1000vus.js`

**Based on Cypress Tests:**
- `cypress/e2e/happyPath/platform/ceTestcases/apps/appSlug.cy.js` (public access portions)

**Journey Flow:**
1. Setup: Admin creates and releases public app
2. Test: End users access public app → Load definition → Interact → Refresh (no auth)
3. Teardown: Admin deletes app

**Key API Calls:**
- `GET /api/v2/apps/{workspaceSlug}/{appSlug}` - Access public app
- `GET /api/v2/apps/{workspaceSlug}/{appSlug}/{versionId}` - Load app definition

---

### 14. Private App Viewing Journey (500 VUs, 8-10 RPS)
**K6 Test:** `tests/endUser/private_app_viewing_500vus.js`

**Based on Cypress Tests:**
- `cypress/e2e/happyPath/platform/ceTestcases/apps/appSlug.cy.js` (authenticated access)

**Journey Flow:**
1. Setup: Admin creates and releases private app
2. Test: End users login → Access private app → Load definition → Interact → Reload → Logout
3. Teardown: Admin deletes app

**Key API Calls:**
- `POST /api/authenticate/{workspaceId}` - End user login
- `GET /api/v2/apps/{workspaceSlug}/{appSlug}` - Access private app (with auth)
- `GET /api/v2/apps/{workspaceSlug}/{appSlug}/{versionId}` - Load app definition

---

## Enterprise Tests

### 15. Multi-Environment Promotion Journey (500 VUs, 5-8 RPS)
**K6 Test:** `tests/enterprise/multi_env_promotion_journey_500vus.js`

**Based on Cypress Tests:**
- `cypress/e2e/happyPath/platform/eeTestcases/multi-env/multiEnv.cy.js`

**Journey Flow:**
1. Login → Get environments → Create app (development) → Promote to staging → Promote to production → Release → Delete → Logout

**Key API Calls:**
- `GET /api/app-environments` - Get available environments
- `POST /api/apps` - Create app (starts in development)
- `POST /api/apps/{appId}/versions/promote` - Promote to next environment
- `GET /api/apps/{appId}/versions` - Verify versions across environments
- `POST /api/apps/{appId}/release` - Release production version

**Requirements:**
- ToolJet Enterprise Edition
- Multiple environments configured (development, staging, production)

---

## Test Pattern Comparison

### Cypress Test Pattern
```javascript
describe('Feature Test', () => {
  beforeEach(() => {
    cy.defaultWorkspaceLogin();
  });

  it('should perform action', () => {
    cy.visit('/app');
    cy.get('[data-cy="button"]').click();
    cy.verifyToastMessage('Success');
  });
});
```

### K6 Test Pattern
```javascript
export default function () {
  group('Feature Test', function () {
    let authData = login();

    const response = http.post(
      `${BASE_URL}/api/endpoint`,
      JSON.stringify(payload),
      { headers: getAuthHeaders(authData.authToken, authData.workspaceId) }
    );

    checkResponse(response, 200, 'feature action');
  });

  adjustedSleep(5, 3);
}
```

---

## Key Differences

| Aspect | Cypress | K6 |
|--------|---------|-----|
| **Type** | End-to-end UI testing | Load/performance testing |
| **Execution** | Browser-based | API-based (headless) |
| **Scope** | Single user, full interaction | Multiple concurrent users |
| **Focus** | Functional correctness | Performance & scalability |
| **Assertions** | UI element validation | Response code & timing |
| **Sleep** | Waits for UI elements | Conservative sleep multiplier (2.5x) |
| **Data** | Often uses test fixtures | Generates unique test data |

---

## Mapping Summary

| K6 Test | Cypress Base | VUs | RPS | Journey Steps |
|---------|--------------|-----|-----|---------------|
| Authentication (3 tests) | authentication/*.cy.js | 500 | 5-10 | 4-5 |
| App Builder (3 tests) | appbuilder/*.cy.js | 500 | 5-10 | 5-7 |
| Data Sources (4 tests) | marketplace/data-source/*.cy.js | 500-1000 | 8-18 | 7-10 |
| Workspace (2 tests) | platform/workspace/*.cy.js | 500 | 5-8 | 6-8 |
| End User (2 tests) | platform/apps/*.cy.js | 500-1000 | 8-20 | 4-6 |
| Enterprise (1 test) | platform/eeTestcases/*.cy.js | 500 | 5-8 | 8-10 |

---

## References

- Cypress Tests Location: `/Users/adishm/code/ToolJet/cypress-tests/cypress/e2e/`
- Cypress Commands: `/Users/adishm/code/ToolJet/cypress-tests/cypress/commands/`
- K6 Tests Location: `/Users/adishm/code/ToolJet-k6-tests/tests/`
- Common Utilities: `/Users/adishm/code/ToolJet-k6-tests/common/`
