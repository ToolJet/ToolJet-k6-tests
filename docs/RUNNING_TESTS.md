# Running K6 Load Tests for ToolJet

Complete guide to running k6 load tests for ToolJet.

## Prerequisites

### 1. Install K6

**macOS:**
```bash
brew install k6
```

**Linux (Debian/Ubuntu):**
```bash
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg \
  --keyserver hkp://keyserver.ubuntu.com:80 \
  --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | \
  sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6
```

**Windows:**
```powershell
choco install k6
```

### 2. ToolJet Instance

You need a running ToolJet instance with:
- Admin/Builder user credentials
- Workspace ID
- Database connections configured (for data source tests)

### 3. Environment Configuration

```bash
# Copy the example environment file
cp .env.example .env

# Edit with your details
nano .env
```

**Required Variables:**
- `BASE_URL` - Your ToolJet instance URL
- `WORKSPACE_ID` - Your workspace/organization ID
- `EMAIL` - Admin/Builder user email
- `PASSWORD` - User password

## Running Tests

### Individual Test Execution

Run a single test file directly:

```bash
# Run from repository root
k6 run tests/authentication/login_logout_journey_500vus.js

# With custom VUs
k6 run --vus 300 tests/authentication/login_logout_journey_500vus.js

# With custom duration
k6 run --duration 5m tests/authentication/login_logout_journey_500vus.js

# Save results to JSON
k6 run --out json=results/test_output.json tests/authentication/login_logout_journey_500vus.js
```

### Test Suite Execution

Run category-specific test suites:

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

# All tests
./runners/run_all_tests.sh
```

## Understanding Test Results

### Console Output

K6 displays real-time metrics during test execution:

```
scenarios: (100.00%) 1 scenario, 500 max VUs, 14m30s max duration
          ✓ http_req_duration..............: avg=234ms  min=45ms   med=210ms  max=1.2s  p(90)=380ms p(95)=450ms
          ✓ http_req_failed................: 0.08%   ✓ 12      ✗ 14988
            http_req_receiving.............: avg=12ms   min=1ms    med=10ms   max=45ms  p(90)=18ms  p(95)=22ms
            http_req_sending...............: avg=8ms    min=0.5ms  med=7ms    max=30ms  p(90)=12ms  p(95)=15ms
            http_req_waiting...............: avg=214ms  min=40ms   med=193ms  max=1.1s  p(90)=350ms p(95)=410ms
            http_reqs......................: 15000   10.5/s
            iteration_duration.............: avg=47s    min=30s    med=45s    max=75s   p(90)=58s   p(95)=65s
```

**Key Metrics:**
- `http_req_failed` - Failure rate (target: < 0.1%)
- `http_req_duration` - Response time distribution
- `http_reqs` - Total requests and RPS
- `iteration_duration` - Time per complete user journey

### Success Criteria

**✅ Test Passes If:**
- `http_req_failed` rate < 0.001 (0.1%)
- `http_req_duration` p(95) < 2000ms
- No script errors
- All checks pass

**❌ Test Fails If:**
- Failure rate >= 0.1%
- P95 response time >= 2s
- Threshold violations
- Script errors

### Result Files

Test results are saved in `results/` directory:

```
results/
├── authentication_20250124_143022/
│   ├── summary.json       # Full k6 metrics
│   ├── test_output.log    # Console output
│   └── test_report.txt    # Human-readable summary
```

## Environment Variable Override

Override .env variables at runtime:

```bash
# Override BASE_URL
BASE_URL=http://production.tooljet.com k6 run tests/authentication/login_logout_journey_500vus.js

# Override multiple variables
BASE_URL=http://staging.tooljet.com \
WORKSPACE_ID=abc-123 \
SLEEP_MULTIPLIER=3.0 \
k6 run tests/authentication/login_logout_journey_500vus.js
```

## Test Customization

### Adjust VU Levels

Edit the test file directly:

```javascript
export const options = {
  stages: [
    { duration: '2m', target: 100 },   // Change this
    { duration: '2m', target: 300 },   // Change target VUs
    { duration: '8m', target: 300 },
    { duration: '2m', target: 0 },
  ],
  // ...
};
```

### Adjust Sleep Duration

Change `SLEEP_MULTIPLIER` in `.env`:
- `1.0` - Fastest (highest RPS, higher failures)
- `2.0` - Moderate
- `2.5` - Conservative (default)
- `3.0+` - Ultra-conservative (lowest failures)

### Adjust Thresholds

Edit thresholds in test file:

```javascript
thresholds: {
  http_req_duration: ['p(95)<2000'],      // 95th percentile < 2s
  http_req_failed: ['rate<0.001'],        // < 0.1% failures
  'http_req_duration{name:login}': ['p(95)<1000'], // Specific endpoint
},
```

## Debugging

### Enable Verbose Logging

```bash
# Set DEBUG in .env
DEBUG=true k6 run tests/authentication/login_logout_journey_500vus.js

# Or use k6 flags
k6 run --http-debug=full tests/authentication/login_logout_journey_500vus.js
```

### Check Specific Requests

Add console.log in test scripts:

```javascript
import { check } from 'k6';

const response = http.post(url, payload, headers);
console.log(`Response status: ${response.status}`);
console.log(`Response body: ${response.body}`);
check(response, { 'status is 200': (r) => r.status === 200 });
```

### Dry Run (Single Iteration)

Test with minimal load:

```bash
k6 run --vus 1 --iterations 1 tests/authentication/login_logout_journey_500vus.js
```

## Common Issues

### 1. Authentication Failures

**Symptom:** High failure rate on login requests

**Solutions:**
- Verify `EMAIL` and `PASSWORD` in `.env`
- Check `WORKSPACE_ID` is correct
- Ensure ToolJet instance is accessible
- Check user has correct permissions

### 2. High Failure Rate

**Symptom:** Exceeding 0.1% failure threshold

**Solutions:**
- Increase `SLEEP_MULTIPLIER` (try 3.0 or higher)
- Reduce target VUs
- Check server resources (CPU, memory, database connections)
- Verify network stability

### 3. Timeout Errors

**Symptom:** Requests timing out

**Solutions:**
- Increase timeout in test scripts (default: 60s)
- Check database performance
- Verify network latency
- Scale up ToolJet instance resources

### 4. Connection Pool Exhaustion

**Symptom:** "Too many connections" errors

**Solutions:**
- Reduce VU count
- Increase database max_connections
- Add longer sleeps between requests
- Check for connection leaks in ToolJet

## Best Practices

### 1. Start Small

Always start with low VUs and gradually increase:

```bash
# Start with 10 VUs
k6 run --vus 10 --duration 2m tests/authentication/login_logout_journey_500vus.js

# Then 50 VUs
k6 run --vus 50 --duration 5m tests/authentication/login_logout_journey_500vus.js

# Then full test
k6 run tests/authentication/login_logout_journey_500vus.js
```

### 2. Monitor Server Resources

During tests, monitor:
- CPU usage
- Memory usage
- Database connections
- Network throughput
- Disk I/O

### 3. Use Dedicated Test Environment

- Don't run load tests on production
- Use isolated test environment
- Ensure consistent baseline

### 4. Run Tests Multiple Times

For reliable results:
- Run each test 3-5 times
- Average the results
- Look for consistent patterns

### 5. Clean Up Test Data

Some tests create data (apps, data sources, users). Ensure cleanup:
- Tests should delete created resources
- Manually verify cleanup after test suite
- Reset database if needed

## Advanced Usage

### Cloud Execution

Run tests in k6 Cloud for distributed load:

```bash
# Login to k6 cloud
k6 login cloud

# Run test in cloud
k6 cloud tests/authentication/login_logout_journey_500vus.js
```

### Custom Metrics

Track custom metrics in tests:

```javascript
import { Trend } from 'k6/metrics';

const myTrend = new Trend('my_custom_metric');

export default function() {
  const start = Date.now();
  // ... perform operations
  const duration = Date.now() - start;
  myTrend.add(duration);
}
```

### Tags and Groups

Organize metrics with tags:

```javascript
import { group } from 'k6';

export default function() {
  group('Login Flow', function() {
    // Login requests
  });

  group('App Creation', function() {
    // App creation requests
  });
}
```

## Next Steps

1. **Run smoke tests** - Start with 1-10 VUs
2. **Validate results** - Ensure all checks pass
3. **Gradually increase load** - Move to target VU levels
4. **Analyze bottlenecks** - Identify performance issues
5. **Iterate and optimize** - Improve and re-test

## Support

For issues:
1. Check [Troubleshooting Guide](TROUBLESHOOTING.md)
2. Review test logs in `results/`
3. Check ToolJet logs
4. Open an issue in this repository
