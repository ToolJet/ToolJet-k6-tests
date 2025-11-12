#!/bin/bash

# ===================================================================
# Run Data Source Test Suite
# Usage: ./runners/run_datasource_suite.sh [VU_MULTIPLIER]
# ===================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
RESULTS_DIR="${PROJECT_ROOT}/results"
TESTS_DIR="${PROJECT_ROOT}/tests/dataSources"

VU_MULTIPLIER="${1:-1.0}"

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}Data Source Test Suite${NC}"
echo -e "${BLUE}================================================${NC}"
echo -e "VU Multiplier: ${YELLOW}${VU_MULTIPLIER}x${NC}"
echo -e "${BLUE}================================================${NC}"

mkdir -p "${RESULTS_DIR}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
SUITE_DIR="${RESULTS_DIR}/datasource_${TIMESTAMP}"
mkdir -p "${SUITE_DIR}"

export K6_VU_MULTIPLIER="${VU_MULTIPLIER}"

echo -e "\n${GREEN}1/4: PostgreSQL Full Journey${NC}"
k6 run --out json="${SUITE_DIR}/postgresql.json" \
    --summary-export="${SUITE_DIR}/postgresql_summary.json" \
    "${TESTS_DIR}/postgresql_full_journey_500vus.js"

echo -e "\n${GREEN}2/4: MySQL Full Journey${NC}"
k6 run --out json="${SUITE_DIR}/mysql.json" \
    --summary-export="${SUITE_DIR}/mysql_summary.json" \
    "${TESTS_DIR}/mysql_full_journey_500vus.js"

echo -e "\n${GREEN}3/4: REST API Full Journey${NC}"
k6 run --out json="${SUITE_DIR}/restapi.json" \
    --summary-export="${SUITE_DIR}/restapi_summary.json" \
    "${TESTS_DIR}/restapi_full_journey_500vus.js"

echo -e "\n${GREEN}4/4: All Data Sources Mixed Journey${NC}"
k6 run --out json="${SUITE_DIR}/all_datasources.json" \
    --summary-export="${SUITE_DIR}/all_datasources_summary.json" \
    "${TESTS_DIR}/all_datasources_journey_1000vus.js"

echo -e "\n${GREEN}✓ Data Source suite completed${NC}"
echo -e "Results saved in: ${SUITE_DIR}"
