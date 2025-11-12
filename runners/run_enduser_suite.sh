#!/bin/bash

# ===================================================================
# Run End User Test Suite
# Usage: ./runners/run_enduser_suite.sh [VU_MULTIPLIER]
# ===================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
RESULTS_DIR="${PROJECT_ROOT}/results"
TESTS_DIR="${PROJECT_ROOT}/tests/endUser"

VU_MULTIPLIER="${1:-1.0}"

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}End User Test Suite${NC}"
echo -e "${BLUE}================================================${NC}"
echo -e "VU Multiplier: ${YELLOW}${VU_MULTIPLIER}x${NC}"
echo -e "${BLUE}================================================${NC}"

mkdir -p "${RESULTS_DIR}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
SUITE_DIR="${RESULTS_DIR}/enduser_${TIMESTAMP}"
mkdir -p "${SUITE_DIR}"

export K6_VU_MULTIPLIER="${VU_MULTIPLIER}"

echo -e "\n${GREEN}1/2: Public App Viewing Journey${NC}"
k6 run --out json="${SUITE_DIR}/public_app_viewing.json" \
    --summary-export="${SUITE_DIR}/public_app_viewing_summary.json" \
    "${TESTS_DIR}/public_app_viewing_1000vus.js"

echo -e "\n${GREEN}2/2: Private App Viewing Journey${NC}"
k6 run --out json="${SUITE_DIR}/private_app_viewing.json" \
    --summary-export="${SUITE_DIR}/private_app_viewing_summary.json" \
    "${TESTS_DIR}/private_app_viewing_500vus.js"

echo -e "\n${GREEN}✓ End User suite completed${NC}"
echo -e "Results saved in: ${SUITE_DIR}"
