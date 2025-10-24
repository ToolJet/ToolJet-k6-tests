#!/bin/bash

# ===================================================================
# Run Workspace Test Suite
# Usage: ./runners/run_workspace_suite.sh [VU_MULTIPLIER]
# ===================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
RESULTS_DIR="${PROJECT_ROOT}/results"
TESTS_DIR="${PROJECT_ROOT}/tests/workspace"

VU_MULTIPLIER="${1:-1.0}"

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}Workspace Test Suite${NC}"
echo -e "${BLUE}================================================${NC}"
echo -e "VU Multiplier: ${YELLOW}${VU_MULTIPLIER}x${NC}"
echo -e "${BLUE}================================================${NC}"

mkdir -p "${RESULTS_DIR}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
SUITE_DIR="${RESULTS_DIR}/workspace_${TIMESTAMP}"
mkdir -p "${SUITE_DIR}"

export K6_VU_MULTIPLIER="${VU_MULTIPLIER}"

echo -e "\n${GREEN}1/2: Workspace Setup Journey${NC}"
k6 run --out json="${SUITE_DIR}/workspace_setup.json" \
    --summary-export="${SUITE_DIR}/workspace_setup_summary.json" \
    "${TESTS_DIR}/workspace_setup_journey_500vus.js"

echo -e "\n${GREEN}2/2: User Management Journey${NC}"
k6 run --out json="${SUITE_DIR}/user_management.json" \
    --summary-export="${SUITE_DIR}/user_management_summary.json" \
    "${TESTS_DIR}/user_management_journey_500vus.js"

echo -e "\n${GREEN}✓ Workspace suite completed${NC}"
echo -e "Results saved in: ${SUITE_DIR}"
