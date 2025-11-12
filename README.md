# ToolJet K6 Load Test Suite

Comprehensive k6 load testing suite for ToolJet, covering all major user journeys and operations based on the Cypress test suite.

## Overview

This repository contains **complete user journey tests** (not isolated endpoint tests) organized to match the ToolJet Cypress test structure. All tests target **500-1000 VUs** with **0%-0.1% failure rate** for production-ready performance validation.

## Repository Structure

```
ToolJet-k6-tests/
├── common/                    # Shared utilities and helpers
│   ├── config.js             # Environment configuration
│   ├── auth.js               # Authentication helpers
│   └── helpers.js            # Common functions
│
├── tests/                     # Test scripts (mirrors Cypress structure)
│   ├── authentication/       # Login, logout, user management
│   ├── appBuilder/           # App lifecycle, components
│   ├── dataSources/          # Data source operations
│   ├── workspace/            # Workspace and folder management
│   ├── endUser/              # Public/private app viewing
│   └── enterprise/           # Multi-env, SSO, workflows
│
├── runners/                   # Test suite runners
│   ├── run_all_tests.sh     # Run all test suites
│   └── run_*_suite.sh       # Category-specific runners
│
├── results/                   # Test results (gitignored)
└── docs/                      # Documentation
```

## Quick Start

### 1. Prerequisites

```bash
# Install k6
brew install k6  # macOS
# OR
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6  # Debian/Ubuntu
```

### 2. Configure Environment

```bash
# Copy example environment file
cp .env.example .env

# Edit .env with your ToolJet instance details
nano .env
```

### 3. Run Tests

```bash
# Run a single test
k6 run tests/authentication/login_logout_journey_500vus.js

# Run an entire test suite
./runners/run_authentication_suite.sh

# Run all tests
./runners/run_all_tests.sh
```

## Test Categories

### Authentication & User Management
- **Login/Logout Journey** (500 VUs, 8-10 RPS)
- **User Invite & Onboarding** (500 VUs, 5-8 RPS)
- **Password Reset** (500 VUs, 5-8 RPS)

### App Builder Workflows
- **App Lifecycle** (500 VUs, 8-10 RPS) - Create → Edit → Release → Delete
- **Component Workflow** (500 VUs, 6-8 RPS) - Add components → Configure
- **Multi-page Apps** (500 VUs, 5-8 RPS) - Multi-page creation and navigation

### Data Sources
- **PostgreSQL Full Journey** (500 VUs, 8-10 RPS)
- **MySQL Full Journey** (500 VUs, 8-10 RPS)
- **REST API Journey** (500 VUs, 10-12 RPS)
- **Mixed Data Sources** (1000 VUs, 15-18 RPS)

### Workspace Management
- **Workspace Setup** (500 VUs, 6-8 RPS) - Folders, apps, organization
- **User Management** (500 VUs, 5-8 RPS) - Roles, permissions

### End User Scenarios
- **Public App Viewing** (1000 VUs, 15-18 RPS) - No authentication
- **Private App Viewing** (500 VUs, 8-10 RPS) - Authenticated access

### Enterprise Features
- **Multi-Environment Promotion** (500 VUs, 5-8 RPS)
- **SSO Login** (500 VUs, 5-8 RPS)
- **Workflows** (500 VUs, 5-8 RPS)

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `BASE_URL` | ToolJet instance URL | `http://localhost:3000` |
| `WORKSPACE_ID` | Workspace/Organization ID | Required |
| `EMAIL` | Test user email | `admin@example.com` |
| `PASSWORD` | Test user password | `password` |
| `SLEEP_MULTIPLIER` | Sleep duration multiplier | `2.5` |

## Test Configuration

All tests follow this pattern for 0%-0.1% failure rate:

```javascript
export const options = {
  stages: [
    { duration: '2m', target: 100 },   // Warm up
    { duration: '2m', target: 500 },   // Ramp to target
    { duration: '8m', target: 500 },   // Hold and measure
    { duration: '2m', target: 0 },     // Cool down
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'],    // 95% under 2s
    http_req_failed: ['rate<0.001'],      // 0.1% failure rate
  },
};
```

## Running Specific Suites

```bash
# Authentication tests
./runners/run_authentication_suite.sh

# App builder tests
./runners/run_builder_suite.sh

# Data source tests
./runners/run_datasource_suite.sh

# Workspace tests
./runners/run_workspace_suite.sh

# End user tests
./runners/run_enduser_suite.sh

# Enterprise tests
./runners/run_enterprise_suite.sh
```

## Results

Test results are saved to the `results/` directory with timestamps:

```
results/
├── authentication_20250124_143022/
│   ├── summary.json
│   └── test_output.log
├── builder_20250124_144530/
└── ...
```

## Success Criteria

✅ HTTP request failure rate < 0.1%
✅ 95th percentile response time < 2s
✅ All user journeys complete successfully
✅ RPS targets met for each test category

## Documentation

- [Running Tests](docs/RUNNING_TESTS.md) - Detailed execution guide
- [API Reference](docs/API_REFERENCE.md) - ToolJet API endpoints
- [Cypress Mapping](docs/CYPRESS_MAPPING.md) - Cypress to k6 test mapping
- [Troubleshooting](docs/TROUBLESHOOTING.md) - Common issues and solutions

## Contributing

When adding new tests:
1. Follow the existing directory structure
2. Use common utilities from `/common`
3. Target 500-1000 VUs with 0%-0.1% failure rate
4. Use complete user journeys (not isolated endpoints)
5. Add runner scripts for new test categories
6. Update documentation

## Test Coverage

Based on ToolJet Cypress test suite:
- 93+ test scenarios identified
- 15+ core journeys implemented (Phase 1)
- Covers authentication, app building, data sources, workspace management, and end-user scenarios

## License

Same as ToolJet project

## Support

For issues or questions:
- Check [Troubleshooting Guide](docs/TROUBLESHOOTING.md)
- Review [ToolJet Documentation](https://docs.tooljet.com)
- Open an issue in this repository
