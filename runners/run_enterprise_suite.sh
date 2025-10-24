#!/bin/bash

# ===================================================================
# Run Enterprise Test Suite
# Usage: ./runners/run_enterprise_suite.sh [VU_MULTIPLIER]
# Note: Requires ToolJet Enterprise Edition
# ===================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
RESULTS_DIR="${PROJECT_ROOT}/results"
TESTS_DIR="${PROJECT_ROOT}/tests/enterprise"

VU_MULTIPLIER="${1:-1.0}"

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}Enterprise Test Suite${NC}"
echo -e "${BLUE}================================================${NC}"
echo -e "${YELLOW}⚠️  Requires ToolJet Enterprise Edition${NC}"
echo -e "VU Multiplier: ${YELLOW}${VU_MULTIPLIER}x${NC}"
echo -e "${BLUE}================================================${NC}"

mkdir -p "${RESULTS_DIR}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
SUITE_DIR="${RESULTS_DIR}/enterprise_${TIMESTAMP}"
mkdir -p "${SUITE_DIR}"

export K6_VU_MULTIPLIER="${VU_MULTIPLIER}"

echo -e "\n${GREEN}1/1: Multi-Environment Promotion Journey${NC}"
k6 run --out json="${SUITE_DIR}/multi_env_promotion.json" \
    --summary-export="${SUITE_DIR}/multi_env_promotion_summary.json" \
    "${TESTS_DIR}/multi_env_promotion_journey_500vus.js"

echo -e "\n${GREEN}✓ Enterprise suite completed${NC}"
echo -e "Results saved in: ${SUITE_DIR}"
