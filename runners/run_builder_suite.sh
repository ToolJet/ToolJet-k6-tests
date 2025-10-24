#!/bin/bash

# ===================================================================
# Run App Builder Test Suite
# Usage: ./runners/run_builder_suite.sh [VU_MULTIPLIER]
# ===================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
RESULTS_DIR="${PROJECT_ROOT}/results"
TESTS_DIR="${PROJECT_ROOT}/tests/appBuilder"

VU_MULTIPLIER="${1:-1.0}"

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}App Builder Test Suite${NC}"
echo -e "${BLUE}================================================${NC}"
echo -e "VU Multiplier: ${YELLOW}${VU_MULTIPLIER}x${NC}"
echo -e "${BLUE}================================================${NC}"

mkdir -p "${RESULTS_DIR}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
SUITE_DIR="${RESULTS_DIR}/builder_${TIMESTAMP}"
mkdir -p "${SUITE_DIR}"

export K6_VU_MULTIPLIER="${VU_MULTIPLIER}"

echo -e "\n${GREEN}1/3: App Lifecycle Journey${NC}"
k6 run --out json="${SUITE_DIR}/app_lifecycle.json" \
    --summary-export="${SUITE_DIR}/app_lifecycle_summary.json" \
    "${TESTS_DIR}/app_lifecycle_journey_500vus.js"

echo -e "\n${GREEN}2/3: Component Workflow Journey${NC}"
k6 run --out json="${SUITE_DIR}/component_workflow.json" \
    --summary-export="${SUITE_DIR}/component_workflow_summary.json" \
    "${TESTS_DIR}/component_workflow_journey_500vus.js"

echo -e "\n${GREEN}3/3: Multi-Page App Journey${NC}"
k6 run --out json="${SUITE_DIR}/multipage_app.json" \
    --summary-export="${SUITE_DIR}/multipage_app_summary.json" \
    "${TESTS_DIR}/multipage_app_journey_500vus.js"

echo -e "\n${GREEN}✓ App Builder suite completed${NC}"
echo -e "Results saved in: ${SUITE_DIR}"
