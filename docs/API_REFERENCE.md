# ToolJet API Reference for K6 Load Tests

This document provides a comprehensive reference of the ToolJet APIs used in the k6 load test suite.

## Table of Contents

- [Authentication APIs](#authentication-apis)
- [App Management APIs](#app-management-apis)
- [Component APIs](#component-apis)
- [Data Source APIs](#data-source-apis)
- [Query APIs](#query-apis)
- [Workspace (Organization) APIs](#workspace-organization-apis)
- [User Management APIs](#user-management-apis)
- [Environment APIs](#environment-apis)
- [Common Headers](#common-headers)

---

## Authentication APIs

### Login
**Endpoint:** `POST /api/authenticate/{workspaceId}`

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password",
  "redirectTo": "/"
}
```

**Response (200):**
```json
{
  "id": "user-uuid",
  "email": "user@example.com",
  "current_organization_id": "workspace-uuid",
  "auth_token": "token-value"
}
```

**Sets Cookie:** `tj_auth_token`

---

### Logout
**Endpoint:** `GET /api/session/logout`

**Headers:** Requires auth headers (see [Common Headers](#common-headers))

**Response:** 200 OK

---

### Activate Account
**Endpoint:** `POST /api/activate`

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "newpassword",
  "organizationToken": "invitation-token"
}
```

**Response:** 201 Created

---

### Accept Invite
**Endpoint:** `POST /api/accept-invite`

**Headers:** Requires auth headers

**Request Body:**
```json
{
  "token": "invitation-token"
}
```

**Response:** 200 OK

---

### Forgot Password
**Endpoint:** `POST /api/forgot-password`

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Response:** 201 Created

---

### Reset Password
**Endpoint:** `POST /api/reset-password`

**Request Body:**
```json
{
  "token": "reset-token",
  "password": "newpassword"
}
```

**Response:** 201 Created

---

## App Management APIs

### Create App
**Endpoint:** `POST /api/apps`

**Headers:** Requires auth headers

**Request Body:**
```json
{
  "name": "My App",
  "type": "default"
}
```

**Response (201):**
```json
{
  "id": "app-uuid",
  "name": "My App",
  "slug": "app-uuid",
  "editing_version": {
    "id": "version-uuid",
    "name": "v1"
  },
  "definition": {
    "pages": {
      "page-uuid": {
        "id": "page-uuid",
        "name": "Home",
        "handle": "home"
      }
    }
  },
  "app_environments": [
    {
      "id": "env-uuid",
      "name": "production",
      "is_default": true
    }
  ]
}
```

---

### Get App
**Endpoint:** `GET /api/apps/{appId}`

**Headers:** Requires auth headers

**Response:** 200 OK (returns app details)

---

### Get App by Slug
**Endpoint:** `GET /api/v2/apps/{workspaceSlug}/{appSlug}`

**Headers:** Optional auth headers (required for private apps)

**Response:** 200 OK

---

### Get App Definition
**Endpoint:** `GET /api/v2/apps/{workspaceSlug}/{appSlug}/{versionId}`

**Headers:** Optional auth headers

**Response (200):**
```json
{
  "id": "app-uuid",
  "definition": {
    "pages": {},
    "globalSettings": {}
  }
}
```

---

### Update App
**Endpoint:** `PATCH /api/apps/{appId}`

**Headers:** Requires auth headers

**Request Body:**
```json
{
  "name": "Updated Name",
  "slug": "custom-slug",
  "is_public": true
}
```

**Response:** 200 OK

---

### Delete App
**Endpoint:** `DELETE /api/apps/{appId}`

**Headers:** Requires auth headers

**Response:** 200 OK

---

### Release App
**Endpoint:** `POST /api/apps/{appId}/release`

**Headers:** Requires auth headers

**Request Body:**
```json
{
  "versionId": "version-uuid"
}
```

**Response:** 200 OK

---

### Get App Versions
**Endpoint:** `GET /api/apps/{appId}/versions`

**Headers:** Requires auth headers

**Response (200):**
```json
{
  "versions": [
    {
      "id": "version-uuid",
      "name": "v1",
      "definition": {}
    }
  ]
}
```

---

## Component APIs

### Add Component
**Endpoint:** `POST /api/v2/apps/{appId}/versions/{versionId}/components`

**Headers:** Requires auth headers

**Request Body:**
```json
{
  "is_user_switched_version": false,
  "pageId": "page-uuid",
  "diff": {
    "component-id": {
      "name": "table1",
      "type": "Table",
      "layouts": {
        "desktop": { "top": 90, "left": 9, "width": 6, "height": 40 },
        "mobile": { "top": 90, "left": 9, "width": 6, "height": 40 }
      },
      "properties": {
        "title": { "value": "My Table" },
        "data": { "value": "{{[]}}" }
      }
    }
  }
}
```

**Response:** 201 Created

---

## Page APIs

### Add Page
**Endpoint:** `POST /api/v2/apps/{appId}/versions/{versionId}/pages`

**Headers:** Requires auth headers

**Request Body:**
```json
{
  "name": "Dashboard",
  "handle": "dashboard"
}
```

**Response (201):**
```json
{
  "id": "page-uuid",
  "name": "Dashboard",
  "handle": "dashboard"
}
```

---

### Get Pages
**Endpoint:** `GET /api/v2/apps/{appId}/versions/{versionId}/pages`

**Headers:** Requires auth headers

**Response (200):**
```json
{
  "pages": [
    {
      "id": "page-uuid",
      "name": "Home",
      "handle": "home"
    }
  ]
}
```

---

## Data Source APIs

### Create Data Source
**Endpoint:** `POST /api/data-sources`

**Headers:** Requires auth headers

**Request Body (PostgreSQL):**
```json
{
  "name": "postgres-ds",
  "kind": "postgresql",
  "options": [
    { "key": "host", "value": "localhost" },
    { "key": "port", "value": "5432" },
    { "key": "database", "value": "mydb" },
    { "key": "username", "value": "user" },
    { "key": "password", "value": "pass", "encrypted": true },
    { "key": "ssl_enabled", "value": false },
    { "key": "ssl_certificate", "value": "none" }
  ],
  "scope": "global"
}
```

**Request Body (MySQL):**
```json
{
  "name": "mysql-ds",
  "kind": "mysql",
  "options": [
    { "key": "host", "value": "localhost" },
    { "key": "port", "value": "3306" },
    { "key": "database", "value": "mydb" },
    { "key": "username", "value": "user" },
    { "key": "password", "value": "pass", "encrypted": true },
    { "key": "ssl_enabled", "value": false },
    { "key": "ssl_certificate", "value": "none" }
  ],
  "scope": "global"
}
```

**Request Body (REST API):**
```json
{
  "name": "restapi-ds",
  "kind": "restapi",
  "options": [
    { "key": "url", "value": "https://api.example.com" },
    { "key": "auth_type", "value": "none" },
    { "key": "headers", "value": [] },
    { "key": "url_params", "value": [] }
  ],
  "scope": "global"
}
```

**Response (201):**
```json
{
  "id": "datasource-uuid",
  "name": "postgres-ds",
  "kind": "postgresql"
}
```

---

### Delete Data Source
**Endpoint:** `DELETE /api/data-sources/{dataSourceId}`

**Headers:** Requires auth headers

**Response:** 200 OK

---

## Query APIs

### Create Query
**Endpoint:** `POST /api/data-queries/data-sources/{dataSourceId}/versions/{versionId}`

**Headers:** Requires auth headers

**Request Body (SQL):**
```json
{
  "app_id": "app-uuid",
  "app_version_id": "version-uuid",
  "name": "query1",
  "kind": "postgresql",
  "options": {
    "mode": "sql",
    "query": "SELECT * FROM users;",
    "transformationLanguage": "javascript",
    "enableTransformation": false
  },
  "data_source_id": "datasource-uuid",
  "plugin_id": null
}
```

**Request Body (REST API):**
```json
{
  "app_id": "app-uuid",
  "app_version_id": "version-uuid",
  "name": "fetch-users",
  "kind": "restapi",
  "options": {
    "method": "GET",
    "url": "/users",
    "headers": [],
    "url_params": [],
    "body": [],
    "json_body": null,
    "body_toggle": false,
    "transformationLanguage": "javascript",
    "enableTransformation": false
  },
  "data_source_id": "datasource-uuid",
  "plugin_id": null
}
```

**Response (201):**
```json
{
  "id": "query-uuid",
  "name": "query1"
}
```

---

### Run Query
**Endpoint:** `POST /api/data-queries/{queryId}/versions/{versionId}/run/{environmentId}`

**Headers:** Requires auth headers + Cookie with app_id

**Request Body:**
```json
{}
```

**Response:** 201 Created (with query results)

---

## Workspace (Organization) APIs

### List Workspaces
**Endpoint:** `GET /api/organizations`

**Headers:** Requires auth headers

**Response (200):**
```json
{
  "organizations": [
    {
      "id": "workspace-uuid",
      "name": "My Workspace",
      "slug": "my-workspace"
    }
  ]
}
```

---

### Get Workspace
**Endpoint:** `GET /api/organizations/{workspaceId}`

**Headers:** Requires auth headers

**Response (200):**
```json
{
  "id": "workspace-uuid",
  "name": "My Workspace",
  "slug": "my-workspace"
}
```

---

### Create Workspace
**Endpoint:** `POST /api/organizations`

**Headers:** Requires auth headers

**Request Body:**
```json
{
  "name": "New Workspace",
  "slug": "new-workspace"
}
```

**Response (201):**
```json
{
  "id": "workspace-uuid",
  "name": "New Workspace",
  "slug": "new-workspace"
}
```

---

### Update Workspace
**Endpoint:** `PATCH /api/organizations/{workspaceId}`

**Headers:** Requires auth headers

**Request Body:**
```json
{
  "name": "Updated Name",
  "slug": "updated-slug"
}
```

**Response:** 200 OK

---

### Switch Workspace
**Endpoint:** `GET /api/switch/{workspaceId}`

**Headers:** Requires auth cookie

**Response:** 200 OK

---

## User Management APIs

### List Users
**Endpoint:** `GET /api/organization-users`

**Headers:** Requires auth headers

**Response (200):**
```json
{
  "users": [
    {
      "id": "user-uuid",
      "email": "user@example.com",
      "first_name": "John",
      "role": "admin"
    }
  ]
}
```

---

### Invite User
**Endpoint:** `POST /api/organization-users`

**Headers:** Requires auth headers

**Request Body:**
```json
{
  "email": "newuser@example.com",
  "firstName": "Jane",
  "lastName": "Doe",
  "groups": [],
  "role": "end-user",
  "userMetadata": {}
}
```

**Response (201):**
```json
{
  "id": "org-user-uuid",
  "email": "newuser@example.com"
}
```

---

### Archive User
**Endpoint:** `PATCH /api/organization-users/{organizationUserId}/archive`

**Headers:** Requires auth headers

**Response:** 200 OK

---

### Unarchive User
**Endpoint:** `PATCH /api/organization-users/{organizationUserId}/unarchive`

**Headers:** Requires auth headers

**Response:** 200 OK

---

### Get Group Permissions
**Endpoint:** `GET /api/v2/group-permissions`

**Headers:** Requires auth headers

**Response (200):**
```json
{
  "groupPermissions": [
    {
      "id": "group-uuid",
      "name": "Admin",
      "type": "admin"
    },
    {
      "id": "group-uuid",
      "name": "Builder",
      "type": "builder"
    },
    {
      "id": "group-uuid",
      "name": "End-user",
      "type": "end-user"
    }
  ]
}
```

---

## Environment APIs (Enterprise)

### Get Environments
**Endpoint:** `GET /api/app-environments`

**Headers:** Requires auth headers

**Response (200):**
```json
{
  "environments": [
    {
      "id": "env-uuid",
      "name": "development",
      "is_default": true
    },
    {
      "id": "env-uuid",
      "name": "staging",
      "is_default": false
    },
    {
      "id": "env-uuid",
      "name": "production",
      "is_default": false
    }
  ]
}
```

---

### Promote App Version
**Endpoint:** `POST /api/apps/{appId}/versions/promote`

**Headers:** Requires auth headers

**Request Body:**
```json
{
  "version_id": "version-uuid",
  "environment_id": "target-env-uuid"
}
```

**Response (201):**
```json
{
  "id": "new-version-uuid",
  "version_id": "new-version-uuid"
}
```

---

## Common Headers

### Required for All Authenticated Requests

```javascript
{
  'Tj-Workspace-Id': 'workspace-uuid',  // Note: Capital T and W
  'Cookie': 'tj_auth_token=token-value',
  'Content-Type': 'application/json'
}
```

**CRITICAL:** The workspace header MUST be `Tj-Workspace-Id` with capital T and W. Using lowercase will result in 401 Unauthorized errors.

### Helper Function (from common/auth.js)

```javascript
export function getAuthHeaders(authToken, workspaceId, additionalHeaders = {}) {
  return {
    'Tj-Workspace-Id': workspaceId,
    'Cookie': `tj_auth_token=${authToken}`,
    'Content-Type': 'application/json',
    ...additionalHeaders,
  };
}
```

---

## Response Codes

| Code | Meaning |
|------|---------|
| 200 | Success - Request completed successfully |
| 201 | Created - Resource created successfully |
| 400 | Bad Request - Invalid request parameters |
| 401 | Unauthorized - Missing or invalid authentication |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource does not exist |
| 500 | Internal Server Error - Server error |

---

## Common Patterns

### Pagination
Many list endpoints support pagination:
```
GET /api/endpoint?page=1&limit=20
```

### Error Response Format
```json
{
  "message": "Error description",
  "statusCode": 400
}
```

---

## Notes

1. **Authentication Token**: Most APIs require the `tj_auth_token` cookie obtained from the login endpoint
2. **Workspace Context**: The `Tj-Workspace-Id` header is required for all workspace-scoped operations
3. **Rate Limiting**: ToolJet may implement rate limiting on certain endpoints
4. **Timeouts**: Default timeout is 30 seconds for most operations, 60 seconds for query execution
5. **Data Source Connections**: Data source creation may take longer as it validates the connection

---

## References

- ToolJet API Documentation: https://docs.tooljet.com/docs/
- K6 Documentation: https://k6.io/docs/
- Common Utilities: `common/auth.js`, `common/helpers.js`
