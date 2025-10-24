#!/bin/bash

# ===================================================================
# Run All ToolJet K6 Load Tests
# This script runs all test suites sequentially
# Usage: ./runners/run_all_tests.sh [VU_MULTIPLIER]
# Example: ./runners/run_all_tests.sh 0.5  (runs at 50% of default VUs)
# ===================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
RESULTS_DIR="${PROJECT_ROOT}/results"

# Default VU multiplier (1.0 = 100% of configured VUs)
VU_MULTIPLIER="${1:-1.0}"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}ToolJet K6 Load Tests - Full Suite${NC}"
echo -e "${BLUE}================================================${NC}"
echo -e "VU Multiplier: ${YELLOW}${VU_MULTIPLIER}x${NC}"
echo -e "Results Directory: ${RESULTS_DIR}"
echo -e "${BLUE}================================================${NC}"

# Create results directory
mkdir -p "${RESULTS_DIR}"

# Timestamp for this test run
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
SUITE_RESULTS_DIR="${RESULTS_DIR}/full_suite_${TIMESTAMP}"
mkdir -p "${SUITE_RESULTS_DIR}"

# Track overall results
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Function to run a test suite
run_suite() {
    local suite_name=$1
    local suite_script=$2

    echo -e "\n${GREEN}Running ${suite_name}...${NC}"
    TOTAL_TESTS=$((TOTAL_TESTS + 1))

    if bash "${SCRIPT_DIR}/${suite_script}" "${VU_MULTIPLIER}"; then
        echo -e "${GREEN}✓ ${suite_name} completed successfully${NC}"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo -e "${RED}✗ ${suite_name} failed${NC}"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
}

# Run all test suites
run_suite "Authentication Suite" "run_authentication_suite.sh"
run_suite "App Builder Suite" "run_builder_suite.sh"
run_suite "Data Source Suite" "run_datasource_suite.sh"
run_suite "Workspace Suite" "run_workspace_suite.sh"
run_suite "End User Suite" "run_enduser_suite.sh"
run_suite "Enterprise Suite" "run_enterprise_suite.sh"

# Summary
echo -e "\n${BLUE}================================================${NC}"
echo -e "${BLUE}Test Suite Summary${NC}"
echo -e "${BLUE}================================================${NC}"
echo -e "Total Suites: ${TOTAL_TESTS}"
echo -e "${GREEN}Passed: ${PASSED_TESTS}${NC}"
echo -e "${RED}Failed: ${FAILED_TESTS}${NC}"
echo -e "Results saved in: ${SUITE_RESULTS_DIR}"
echo -e "${BLUE}================================================${NC}"

# Exit with error if any tests failed
if [ $FAILED_TESTS -gt 0 ]; then
    exit 1
fi

exit 0
