# Troubleshooting Guide

This guide helps you diagnose and resolve common issues when running ToolJet k6 load tests.

## Table of Contents

- [Authentication Issues](#authentication-issues)
- [Connection Issues](#connection-issues)
- [Performance Issues](#performance-issues)
- [Data Source Issues](#data-source-issues)
- [Test Failures](#test-failures)
- [Environment Issues](#environment-issues)
- [VU and RPS Issues](#vu-and-rps-issues)
- [Debugging Tips](#debugging-tips)

---

## Authentication Issues

### Issue: 401 Unauthorized Error

**Symptoms:**
```
✗ App creation failed
✗ Status: 401 Unauthorized
```

**Common Causes:**

1. **Wrong Header Format (Most Common)**
   - **Problem:** Using lowercase `tj-workspace-id` instead of `Tj-Workspace-Id`
   - **Solution:** Ensure you're using the correct header format with capital T and W
   ```javascript
   // WRONG:
   headers: { 'tj-workspace-id': workspaceId }

   // CORRECT:
   headers: { 'Tj-Workspace-Id': workspaceId }
   ```

2. **Invalid Credentials**
   - **Problem:** Wrong email/password in `.env` file
   - **Solution:** Verify credentials:
   ```bash
   # Test login manually
   curl -X POST http://your-tooljet-url/api/authenticate/workspace-id \
     -H "Content-Type: application/json" \
     -d '{"email":"your-email","password":"your-password"}'
   ```

3. **Expired Auth Token**
   - **Problem:** Token expired during long-running test
   - **Solution:** Tests auto-handle this by logging in fresh for each iteration

4. **Wrong Workspace ID**
   - **Problem:** Using incorrect workspace ID in `.env`
   - **Solution:** Get correct workspace ID from ToolJet dashboard URL or API response

**Fix:**
```bash
# Update .env file
WORKSPACE_ID=correct-workspace-uuid-here
EMAIL=correct-email@example.com
PASSWORD=correct-password
```

---

### Issue: Login Failed with 404

**Symptoms:**
```
✗ Login failed
✗ Status: 404 Not Found
```

**Causes:**
- Wrong BASE_URL
- Missing workspace ID in login URL
- ToolJet instance not running

**Solution:**
```bash
# Verify ToolJet is accessible
curl http://your-tooljet-url/api/health

# Check correct format
BASE_URL=http://172.168.187.1  # No trailing slash!
```

---

## Connection Issues

### Issue: Connection Timeout

**Symptoms:**
```
✗ request timeout
WARN[0030] Request Failed  error="Get \"http://...\": context deadline exceeded"
```

**Solutions:**

1. **Increase Timeout**
   ```javascript
   // In common/config.js
   export const DEFAULT_TIMEOUT = 60000; // Increase from 30000
   ```

2. **Check Network Connectivity**
   ```bash
   # Test connection
   curl -v http://your-tooljet-url/api/health

   # Check if ToolJet is running
   docker ps | grep tooljet
   ```

3. **Reduce VUs**
   ```bash
   # Run with fewer VUs to test
   ./runners/run_authentication_suite.sh 0.1  # 10% of default VUs
   ```

---

### Issue: Connection Refused

**Symptoms:**
```
✗ connection refused
dial tcp: connect: connection refused
```

**Solutions:**
1. Verify ToolJet is running
2. Check BASE_URL is correct (no https if using http)
3. Ensure no firewall blocking
4. Check Docker network settings

---

## Performance Issues

### Issue: High Failure Rate (>0.1%)

**Symptoms:**
```
✗ { expected: 'rate<0.001', got: 0.025 }
http_req_failed................: 2.5%
```

**Solutions:**

1. **Increase Sleep Multiplier**
   ```bash
   # In .env file
   SLEEP_MULTIPLIER=5.0  # Increase from 2.5
   ```

2. **Reduce VUs**
   ```bash
   # Run with 50% VUs
   ./runners/run_datasource_suite.sh 0.5
   ```

3. **Check ToolJet Server Resources**
   ```bash
   # Check CPU and memory
   docker stats

   # Check logs for errors
   docker logs tooljet-app
   ```

4. **Scale ToolJet Horizontally**
   - Add more ToolJet instances
   - Use load balancer
   - Increase database connections

---

### Issue: Slow Response Times

**Symptoms:**
```
✗ { expected: 'p(95)<2000', got: 3500 }
http_req_duration..............: avg=2.5s min=500ms max=5s p(95)=3.5s
```

**Solutions:**

1. **Optimize Database**
   ```sql
   -- Check slow queries
   SELECT * FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 10;

   -- Add indexes if needed
   ```

2. **Increase ToolJet Resources**
   ```yaml
   # In docker-compose.yml
   services:
     tooljet:
       deploy:
         resources:
           limits:
             cpus: '4'
             memory: 8G
   ```

3. **Reduce Sleep Randomness**
   ```javascript
   // Less random sleep = more predictable load
   adjustedSleep(5, 1);  // Instead of adjustedSleep(5, 5)
   ```

---

## Data Source Issues

### Issue: Data Source Creation Failed

**Symptoms:**
```
✗ create PostgreSQL data source failed
✗ Status: 400 Bad Request
```

**Solutions:**

1. **Verify Database Configuration**
   ```bash
   # Test database connection
   psql -h localhost -p 5432 -U postgres -d mydb

   # Update .env with correct values
   POSTGRES_HOST=localhost
   POSTGRES_PORT=5432
   POSTGRES_DATABASE=mydb
   POSTGRES_USER=postgres
   POSTGRES_PASSWORD=password
   ```

2. **Check Network Accessibility**
   - Ensure database is accessible from ToolJet
   - Check firewall rules
   - Verify connection pooling limits

3. **Verify Data Source Config**
   ```javascript
   // In test file
   const options = [
     { key: 'host', value: POSTGRES_CONFIG.host },
     { key: 'port', value: POSTGRES_CONFIG.port },
     { key: 'database', value: POSTGRES_CONFIG.database },
     { key: 'username', value: POSTGRES_CONFIG.username },
     { key: 'password', value: POSTGRES_CONFIG.password, encrypted: true },
     { key: 'ssl_enabled', value: false },  // Set to true if SSL required
   ];
   ```

---

### Issue: Query Execution Failed

**Symptoms:**
```
✗ run query failed
✗ Status: 500 Internal Server Error
✗ Query could not be completed
```

**Solutions:**

1. **Check SQL Syntax**
   ```javascript
   // Use simple queries for load testing
   'SELECT 1 as test_value;'  // Good
   'SELECT * FROM large_table;'  // May timeout
   ```

2. **Verify Query Timeout**
   ```javascript
   // In common/config.js
   export const QUERY_TIMEOUT = 120000;  // Increase if needed
   ```

3. **Check Data Source Connection**
   - Ensure data source is not deleted
   - Verify connection is still valid
   - Check database connection limits

---

## Test Failures

### Issue: App Creation Fails Intermittently

**Symptoms:**
```
Some iterations: ✓ App created
Other iterations: ✗ App creation failed
```

**Solutions:**

1. **Add Retry Logic**
   ```javascript
   // In common/helpers.js
   function createAppWithRetry(authToken, workspaceId, appName, maxRetries = 3) {
     for (let i = 0; i < maxRetries; i++) {
       const result = createApp(authToken, workspaceId, appName);
       if (result.success) return result;
       sleep(2);  // Wait before retry
     }
     return { success: false };
   }
   ```

2. **Increase Sleep Between Operations**
   ```javascript
   adjustedSleep(10, 5);  // More conservative
   ```

3. **Check Database Locks**
   ```sql
   -- Check for locks
   SELECT * FROM pg_locks WHERE NOT granted;
   ```

---

### Issue: Cleanup Not Working

**Symptoms:**
```
✗ App deleted: undefined
Many test apps left in ToolJet
```

**Solutions:**

1. **Manual Cleanup Script**
   ```javascript
   // cleanup_test_apps.js
   const apps = listApps(authToken, workspaceId);
   apps.filter(app => app.name.includes('LoadTest'))
       .forEach(app => deleteApp(authToken, workspaceId, app.id));
   ```

2. **Use Unique Identifiers**
   ```javascript
   const appName = uniqueName('LoadTest-Cleanup');
   ```

3. **Check Delete Permissions**
   - Ensure user has delete permissions
   - Verify app is not locked

---

## Environment Issues

### Issue: Enterprise Features Not Working

**Symptoms:**
```
✗ Promotion to Staging failed (Enterprise feature may not be enabled)
✗ Status: 403 Forbidden
```

**Solutions:**

1. **Verify Enterprise License**
   ```bash
   # Check ToolJet logs
   docker logs tooljet-app | grep -i enterprise
   ```

2. **Check Environment Configuration**
   ```bash
   # Ensure environments are set up
   curl http://your-tooljet-url/api/app-environments \
     -H "Tj-Workspace-Id: workspace-id" \
     -H "Cookie: tj_auth_token=token"
   ```

3. **Skip Enterprise Tests**
   ```bash
   # Run tests without enterprise suite
   ./runners/run_authentication_suite.sh
   ./runners/run_builder_suite.sh
   ./runners/run_datasource_suite.sh
   # Skip: ./runners/run_enterprise_suite.sh
   ```

---

## VU and RPS Issues

### Issue: Not Reaching Target RPS

**Symptoms:**
```
Expected RPS: 10
Actual RPS: 3-4
```

**Solutions:**

1. **Reduce Sleep Times**
   ```bash
   # In .env
   SLEEP_MULTIPLIER=1.0  # Reduce from 2.5
   ```

2. **Increase VUs**
   ```bash
   # Run with 2x VUs
   ./runners/run_datasource_suite.sh 2.0
   ```

3. **Optimize Test Script**
   ```javascript
   // Remove unnecessary sleeps
   // adjustedSleep(20, 10);  // Remove if not needed
   adjustedSleep(5, 2);  // Use shorter sleeps
   ```

---

### Issue: VU Multiplier Not Working

**Symptoms:**
```
Running with VU_MULTIPLIER=0.5
Still seeing 500 VUs instead of 250
```

**Solution:**
The VU multiplier in runner scripts is for future implementation. Currently, modify the config directly:

```javascript
// In common/config.js
export const VUS_DATASOURCE = 250;  // Instead of 500
```

Or override in test file:
```javascript
export const options = {
  ...getDefaultOptions(250, 'test_name'),  // Override VUs
};
```

---

## Debugging Tips

### Enable Verbose Logging

**In k6 Test:**
```javascript
// Add at start of test
import { check } from 'k6';

export default function () {
  console.log('=== Starting Iteration ===');
  console.log(`VU: ${__VU}, Iteration: ${__ITER}`);

  // Log responses
  const response = http.post(...);
  console.log(`Response Status: ${response.status}`);
  console.log(`Response Body: ${response.body}`);
}
```

### Use k6 Debug Mode
```bash
k6 run --http-debug="full" tests/authentication/login_logout_journey_500vus.js
```

### Check ToolJet Logs
```bash
# Real-time logs
docker logs -f tooljet-app

# Search for errors
docker logs tooljet-app | grep -i error

# Filter by time
docker logs --since 10m tooljet-app
```

### Test Individual API Calls
```bash
# Test login
curl -X POST http://localhost:3000/api/authenticate/workspace-id \
  -H "Content-Type: application/json" \
  -d '{"email":"dev@tooljet.io","password":"password"}' \
  -v

# Test with auth
curl http://localhost:3000/api/apps \
  -H "Tj-Workspace-Id: workspace-id" \
  -H "Cookie: tj_auth_token=token" \
  -v
```

### Use K6 Cloud for Analysis
```bash
# Run test and upload to k6 cloud
k6 cloud tests/authentication/login_logout_journey_500vus.js

# Or run locally and stream to cloud
k6 run --out cloud tests/authentication/login_logout_journey_500vus.js
```

### Check Database Performance
```sql
-- Check active connections
SELECT count(*) FROM pg_stat_activity;

-- Check slow queries
SELECT pid, now() - pg_stat_activity.query_start AS duration, query
FROM pg_stat_activity
WHERE state = 'active' AND now() - pg_stat_activity.query_start > interval '5 seconds';

-- Check locks
SELECT * FROM pg_locks WHERE NOT granted;
```

---

## Common Error Messages

| Error | Likely Cause | Solution |
|-------|--------------|----------|
| `401 Unauthorized` | Wrong auth headers | Use `Tj-Workspace-Id` (capital T & W) |
| `403 Forbidden` | Insufficient permissions | Check user role, verify enterprise features |
| `404 Not Found` | Wrong URL or resource deleted | Verify BASE_URL and resource existence |
| `500 Internal Server Error` | ToolJet server issue | Check ToolJet logs, verify database connection |
| `connection refused` | ToolJet not running | Start ToolJet, check network |
| `timeout` | Response too slow | Increase timeouts, reduce load |
| `Query could not be completed` | Database connection issue | Check data source config, verify database running |

---

## Getting Help

1. **Check Logs First**
   - k6 output
   - ToolJet application logs
   - Database logs

2. **Verify Configuration**
   - `.env` file settings
   - Network connectivity
   - Resource availability

3. **Isolate the Issue**
   - Run single test
   - Reduce VUs to 1
   - Test API calls manually

4. **Report Issues**
   - Include: k6 version, ToolJet version, error messages, test configuration
   - GitHub: https://github.com/anthropics/claude-code/issues
   - ToolJet Issues: https://github.com/ToolJet/ToolJet/issues

---

## Performance Tuning Checklist

- [ ] ToolJet has sufficient CPU/memory resources
- [ ] Database has adequate connection pool size
- [ ] Database has proper indexes
- [ ] Network latency is acceptable (<50ms)
- [ ] SLEEP_MULTIPLIER is tuned for your environment
- [ ] VU count matches your server capacity
- [ ] Test data cleanup is working
- [ ] No resource leaks (memory, connections)
- [ ] Monitoring is in place (CPU, memory, disk, network)
- [ ] Load balancer configured (if using multiple instances)

---

## Best Practices

1. **Start Small**: Begin with low VUs (50-100) and gradually increase
2. **Monitor Resources**: Watch CPU, memory, disk I/O during tests
3. **Use Realistic Data**: Generate unique, realistic test data
4. **Clean Up**: Always clean up test data after runs
5. **Baseline First**: Establish baseline performance before load testing
6. **Incremental Changes**: Change one variable at a time when tuning
7. **Document Results**: Keep records of test results and configurations

---

## Quick Reference Commands

```bash
# Test single endpoint
k6 run --vus 1 --iterations 1 tests/authentication/login_logout_journey_500vus.js

# Run with custom VUs
k6 run --vus 100 --duration 5m tests/authentication/login_logout_journey_500vus.js

# Debug mode
k6 run --http-debug tests/authentication/login_logout_journey_500vus.js

# Generate HTML report
k6 run --out json=results.json tests/authentication/login_logout_journey_500vus.js
k6-reporter results.json

# Check ToolJet health
curl http://localhost:3000/api/health

# View real-time logs
docker logs -f tooljet-app
```
